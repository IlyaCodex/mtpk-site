/**
 * Контакты и базы: пополнение базы пачками по 1000 адресов (на 15 000+
 * строк — секунды). Контакт один на адрес: повтор не создаёт дубль, а
 * дополняет пустые имя, компанию и телефон. Отписавшиеся остаются
 * отписавшимися — в рассылку они не попадут, даже если их добавили снова.
 */
import { Prisma, type Db } from '@mtpk/db';
import type { ParsedContact } from './parse.ts';

export interface AddResult {
  /** адресов в пополнении */
  total: number;
  /** новых контактов (раньше не было ни в одной базе) */
  created: number;
  /** добавлено в эту базу (новые и уже известные) */
  added: number;
  /** уже были в этой базе */
  already: number;
  /** отписались раньше — в базе, но писем не получат */
  unsubscribed: number;
}

const CHUNK = 1000;

export async function addContacts(db: Db, listId: number, contacts: ParsedContact[], source: string): Promise<AddResult> {
  const res: AddResult = { total: contacts.length, created: 0, added: 0, already: 0, unsubscribed: 0 };
  for (let i = 0; i < contacts.length; i += CHUNK) {
    const part = contacts.slice(i, i + CHUNK);
    const rows = (await db.$queryRaw`
      INSERT INTO mailing.contacts (email, name, company, phone, source)
      SELECT * FROM unnest(
        ${part.map((c) => c.email)}::text[],
        ${part.map((c) => c.name ?? null)}::text[],
        ${part.map((c) => c.company ?? null)}::text[],
        ${part.map((c) => c.phone ?? null)}::text[],
        ${part.map(() => source)}::text[]
      )
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(mailing.contacts.name, EXCLUDED.name),
        company = COALESCE(mailing.contacts.company, EXCLUDED.company),
        phone = COALESCE(mailing.contacts.phone, EXCLUDED.phone),
        updated_at = now()
      RETURNING id, (xmax = 0) AS created, status
    `) as { id: number; created: boolean; status: string }[];
    res.created += rows.filter((r) => r.created).length;
    res.unsubscribed += rows.filter((r) => r.status !== 'active').length;
    const ids = rows.map((r) => r.id);
    const inserted = await db.$executeRaw`
      INSERT INTO mailing.list_members (list_id, contact_id)
      SELECT ${listId}, unnest(${ids}::int[])
      ON CONFLICT DO NOTHING
    `;
    res.added += inserted;
    res.already += ids.length - inserted;
  }
  await db.mailList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
  return res;
}

/** Адреса из заявок сайта (последнее имя и телефон по каждому адресу) за период. */
export async function contactsFromLeads(db: Db, from?: Date, to?: Date): Promise<ParsedContact[]> {
  const where = Prisma.sql`email IS NOT NULL AND email <> ''
    ${from ? Prisma.sql`AND created_at >= ${from}` : Prisma.empty}
    ${to ? Prisma.sql`AND created_at < ${to}` : Prisma.empty}`;
  const rows = (await db.$queryRaw`
    SELECT DISTINCT ON (lower(trim(email))) lower(trim(email)) AS email, name, phone
    FROM leads.leads WHERE ${where}
    ORDER BY lower(trim(email)), created_at DESC
  `) as { email: string; name: string | null; phone: string | null }[];
  return rows.map((r) => ({ email: r.email, name: r.name ?? undefined, phone: r.phone ?? undefined }));
}
