/**
 * Импорт адресов из CRM Битрикс24 (вебхук — B24_WEBHOOK, как у сервиса
 * заявок): контакты, компании и лиды с e-mail. Только чтение. Список идёт
 * страницами по 50 записей с фильтром «ID больше последнего» и start=-1 —
 * так Битрикс24 не считает общее число и быстро отдаёт большие базы (15 000+).
 * Пауза между запросами — 0,5 с: лимит REST — 2 запроса в секунду.
 * Ход импорта — в mailing.imports (админка показывает его по ходу).
 */
import type { Db } from '@mtpk/db';
import { addContacts } from './contacts.ts';
import { normalizeEmail, type ParsedContact } from './parse.ts';

export type CrmEntity = 'contact' | 'company' | 'lead';

const SELECT: Record<CrmEntity, string[]> = {
  contact: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL', 'PHONE'],
  company: ['ID', 'TITLE', 'EMAIL', 'PHONE'],
  lead: ['ID', 'NAME', 'LAST_NAME', 'COMPANY_TITLE', 'EMAIL', 'PHONE'],
};

type Multi = { VALUE?: string }[] | undefined;
type Row = Record<string, unknown> & { ID: string; EMAIL?: Multi; PHONE?: Multi };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Вызов REST Битрикс24: JSON, таймаут 20 с; ошибка — исключение с текстом CRM. */
export async function b24(webhook: string, method: string, params: unknown): Promise<unknown> {
  const res = await fetch(`${webhook.replace(/\/?$/, '/')}${method}.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string; error_description?: string };
  if (!res.ok || json.error) throw new Error(`Битрикс24 ${method}: ${json.error_description || json.error || `HTTP ${res.status}`}`);
  return json.result;
}

/** Контакты одной записи CRM: у записи может быть несколько адресов. */
function rowContacts(kind: CrmEntity, r: Row): ParsedContact[] {
  const name =
    kind === 'company'
      ? undefined
      : [r.NAME, r.SECOND_NAME, r.LAST_NAME]
          .filter((x) => typeof x === 'string' && x.trim())
          .join(' ')
          .trim() || undefined;
  const company = kind === 'company' ? String(r.TITLE ?? '').trim() || undefined : kind === 'lead' ? String(r.COMPANY_TITLE ?? '').trim() || undefined : undefined;
  const phone = r.PHONE?.find((p) => p.VALUE)?.VALUE?.trim();
  return (r.EMAIL ?? []).flatMap((e) => {
    const email = normalizeEmail(e.VALUE ?? '');
    return email ? [{ email, name, company, phone }] : [];
  });
}

/** Импорт из CRM в базу listId (фоново); ход — в записи импорта importId. */
export async function importFromCrm(db: Db, webhook: string, importId: number, listId: number, kinds: CrmEntity[]): Promise<void> {
  let processed = 0;
  let added = 0;
  let skipped = 0;
  try {
    for (const kind of kinds) {
      let lastId = 0;
      for (;;) {
        const rows = (await b24(webhook, `crm.${kind}.list`, {
          order: { ID: 'ASC' },
          filter: { '>ID': lastId, HAS_EMAIL: 'Y' },
          select: SELECT[kind],
          start: -1,
        })) as Row[];
        if (!Array.isArray(rows) || !rows.length) break;
        lastId = Number(rows[rows.length - 1]!.ID);
        const contacts = rows.flatMap((r) => rowContacts(kind, r));
        processed += rows.length;
        skipped += rows.length - new Set(contacts.map((c) => c.email)).size;
        if (contacts.length) added += (await addContacts(db, listId, contacts, 'crm')).added;
        await db.mailImport.update({ where: { id: importId }, data: { processed, added, skipped: Math.max(0, skipped) } });
        if (rows.length < 50) break;
        await sleep(500);
      }
    }
    await db.mailImport.update({ where: { id: importId }, data: { status: 'done', processed, added, finishedAt: new Date() } });
  } catch (err) {
    await db.mailImport.update({ where: { id: importId }, data: { status: 'failed', processed, added, error: (err as Error).message.slice(0, 500), finishedAt: new Date() } });
  }
}
