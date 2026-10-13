/**
 * Адреса из писем (на сайте — /r/…, шлюз и сайт передают их сюда):
 *   /r/c/<ссылка>/<токен> — переход: записывается, ведёт на адрес с UTM-метками;
 *   /r/o/<токен>.gif     — открытие письма (картинка 1×1);
 *   /r/u/<токен>         — отписка: страница с подтверждением; POST — отписать
 *                          (и отписка в один клик из почтовой программы, RFC 8058).
 * Проверяльщики ссылок (антиспам почтовых систем, превью мессенджеров) ходят
 * по ссылкам сами — такие переходы не считаются, но ведут куда нужно; так же
 * и ссылки с чужим или испорченным токеном.
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Db } from '@mtpk/db';
import { escapeHtml } from './compile.ts';
import { PUBLIC_URL } from './env.ts';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const ROBOT = /bot\b|crawl|spider|preview|scanner|proofpoint|mimecast|barracuda|safelinks|urldefense|headless|python-requests|curl\/|wget|go-http-client|okhttp/i;
const TOKEN = /^[a-f0-9]{32}$/;
const NO_STORE = { 'cache-control': 'no-store, max-age=0' };

/** Страница сайта для отписки: логотип, заголовок, текст, кнопка или форма. */
function page(title: string, body: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${escapeHtml(title)} — УралИндуктор</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eef2f1;font:16px/1.6 Arial,'Helvetica Neue',sans-serif;color:#18181b;padding:24px;box-sizing:border-box}
  .card{max-width:520px;width:100%;background:#fff;border-radius:18px;padding:40px;box-shadow:0 24px 48px -28px rgba(10,28,37,.35)}
  img{display:block;width:170px;height:auto;margin:0 0 28px}
  h1{margin:0 0 12px;font-size:26px;line-height:1.2}
  p{margin:0 0 22px;color:#3f4a52}
  .btn{display:inline-block;padding:14px 26px;border:0;border-radius:10px;background:#4fab3a;color:#fff;font:bold 15px Arial,sans-serif;text-decoration:none;cursor:pointer}
  .muted{display:inline-block;margin-left:16px;color:#5b6770;font-size:14px}
</style></head><body><div class="card"><a href="${PUBLIC_URL}/"><img src="${PUBLIC_URL}/brand/logo-header-clean.png" alt="УралИндуктор"></a>${body}</div></body></html>`;
}

const html = (reply: FastifyReply, code: number, markup: string) => reply.code(code).headers(NO_STORE).type('text/html; charset=utf-8').send(markup);

export async function publicRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // отписка в один клик из почтовой программы приходит формой (List-Unsubscribe=One-Click)
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => done(null, body));
  const hidden = { schema: { hide: true } };

  // ── переход по ссылке ──────────────────────────────────────────────────
  app.get<{ Params: { link: string; token: string } }>('/r/c/:link/:token', hidden, async (req, reply) => {
    const id = Number(req.params.link);
    const link = Number.isInteger(id) && id > 0 ? await db.mailLink.findUnique({ where: { id } }) : null;
    if (!link) return reply.redirect(`${PUBLIC_URL}/`, 302);
    const ua = String(req.headers['user-agent'] ?? '').slice(0, 300);
    const recipient = TOKEN.test(req.params.token) ? await db.mailRecipient.findUnique({ where: { token: req.params.token } }) : null;
    // считаются переходы получателей этой рассылки; чужая или испорченная ссылка, робот — просто ведут по адресу
    if (recipient && recipient.campaignId === link.campaignId && !ROBOT.test(ua)) {
      const before = await db.mailClick.count({ where: { linkId: link.id, recipientId: recipient.id } });
      const now = new Date();
      await db.$transaction([
        db.mailClick.create({ data: { linkId: link.id, recipientId: recipient.id, userAgent: ua || null } }),
        db.mailLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 }, ...(before === 0 ? { uniqueClicks: { increment: 1 } } : {}) } }),
        db.mailRecipient.update({
          where: { id: recipient.id },
          // переход — значит, письмо открыли (даже если картинки отключены)
          data: { clicks: { increment: 1 }, clickedAt: recipient.clickedAt ?? now, openedAt: recipient.openedAt ?? now },
        }),
      ]);
    }
    return reply.headers(NO_STORE).redirect(link.target, 302);
  });

  // ── открытие письма ────────────────────────────────────────────────────
  app.get<{ Params: { file: string } }>('/r/o/:file', hidden, async (req, reply) => {
    const token = req.params.file.replace(/\.gif$/, '');
    if (TOKEN.test(token)) {
      const r = await db.mailRecipient.findUnique({ where: { token }, select: { id: true, openedAt: true } });
      if (r) await db.mailRecipient.update({ where: { id: r.id }, data: { opens: { increment: 1 }, openedAt: r.openedAt ?? new Date() } });
    }
    return reply.headers(NO_STORE).type('image/gif').send(GIF);
  });

  // ── отписка ────────────────────────────────────────────────────────────
  const recipientOf = (token: string) => (TOKEN.test(token) ? db.mailRecipient.findUnique({ where: { token }, select: { id: true, email: true, contactId: true } }) : null);

  app.get<{ Params: { token: string } }>('/r/u/:token', hidden, async (req, reply) => {
    const r = await recipientOf(req.params.token);
    if (!r) return html(reply, 404, page('Ссылка устарела', `<h1>Ссылка устарела</h1><p>Чтобы отписаться, ответьте на письмо словом «Отписаться» — мы удалим адрес из рассылки.</p><a class="btn" href="${PUBLIC_URL}/">На сайт</a>`));
    const c = r.contactId ? await db.mailContact.findUnique({ where: { id: r.contactId }, select: { status: true } }) : null;
    if (c?.status === 'unsubscribed') {
      return html(reply, 200, page('Вы отписаны', `<h1>Вы уже отписаны</h1><p>Адрес <b>${escapeHtml(r.email)}</b> не получает наших рассылок.</p><a class="btn" href="${PUBLIC_URL}/">На сайт</a>`));
    }
    // подтверждение кнопкой: почтовые проверяльщики открывают ссылки сами и не должны отписывать
    return html(
      reply,
      200,
      page(
        'Отписаться от рассылки',
        `<h1>Отписаться от рассылки?</h1><p>Адрес <b>${escapeHtml(r.email)}</b> больше не будет получать новости и предложения «УралИндуктор». Письма о ваших заявках и заказах это не затронет.</p>
<form method="post"><button class="btn" type="submit">Отписаться</button><a class="muted" href="${PUBLIC_URL}/">Остаться</a></form>`,
      ),
    );
  });

  app.post<{ Params: { token: string } }>('/r/u/:token', hidden, async (req, reply) => {
    const r = await recipientOf(req.params.token);
    if (r) {
      const now = new Date();
      if (r.contactId) await db.mailContact.updateMany({ where: { id: r.contactId, status: { not: 'unsubscribed' } }, data: { status: 'unsubscribed', unsubscribedAt: now } });
      else await db.mailContact.updateMany({ where: { email: r.email, status: { not: 'unsubscribed' } }, data: { status: 'unsubscribed', unsubscribedAt: now } });
      req.log.info({ recipient: r.id }, 'отписка от рассылки');
    }
    return html(reply, 200, page('Вы отписаны', `<h1>Вы отписаны</h1><p>Больше не будем присылать рассылку${r ? ` на <b>${escapeHtml(r.email)}</b>` : ''}. Если это ошибка — напишите нам на info@uralinduktor.ru.</p><a class="btn" href="${PUBLIC_URL}/">На сайт</a>`));
  });
}
