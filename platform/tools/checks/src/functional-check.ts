/**
 * Функциональная проверка клиентских модулей сайта в браузере: меню, поиск,
 * галерея товара, просмотр фото, фильтр каталога, сравнение, «Запросить цену»,
 * согласие на cookie, отправка заявки.
 *
 *   npx tsx tools/checks/src/functional-check.ts [--base=http://127.0.0.1:3200] [--no-submit]
 */
import { chromium, type Page } from 'playwright';
import { chromiumPath } from './browser.ts';

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'] as const;
}));
const BASE = args.get('base') ?? 'http://127.0.0.1:3200';
const PRODUCT = '/products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-376/';
const CATALOG = '/products/drobemetnoe-oborudovanie/kranovogo-tipa/';

const results: [string, boolean, string?][] = [];
async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const note = await fn();
    results.push([name, true, note ?? undefined]);
  } catch (err) {
    results.push([name, false, (err as Error).message.split('\n')[0]]);
  }
}
const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg);
};

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const errors: string[] = [];
async function open(path: string, opts: { mobile?: boolean; consent?: boolean } = {}): Promise<Page> {
  const ctx = await browser.newContext(opts.mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  if (opts.consent !== false) await ctx.addInitScript(() => localStorage.setItem('ui_cookie_consent', '1|v2026.1|x'));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.route('**/*', (r) => (new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort()));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  return page;
}

await check('мобильное меню: открыть, раскрыть «Каталог», закрыть Esc', async () => {
  const page = await open('/', { mobile: true });
  await page.click('[data-nav-toggle]');
  assert(await page.evaluate(() => document.body.classList.contains('nav-open')), 'меню не открылось');
  assert((await page.getAttribute('[data-nav-drawer]', 'aria-hidden')) === 'false', 'aria-hidden не снят');
  await page.click('[data-drawer-acc]');
  assert(await page.locator('.nav-drawer__item--acc.is-open').count(), 'раздел не раскрылся');
  await page.keyboard.press('Escape');
  assert(!(await page.evaluate(() => document.body.classList.contains('nav-open'))), 'меню не закрылось');
});

await check('поиск: окно по «лупе», результаты по запросу', async () => {
  const page = await open('/');
  await page.click('.header__actions [data-search-open]');
  await page.waitForSelector('#search-modal:not([hidden])', { timeout: 5000 });
  await page.fill('#ss-input', 'дробемёт');
  await page.waitForSelector('#ss-list .ss-card', { timeout: 8000 });
  const n = await page.locator('#ss-list .ss-card').count();
  await page.keyboard.press('Escape');
  assert(await page.locator('#search-modal[hidden]').count(), 'окно не закрылось');
  return `${n} результатов`;
});

await check('галерея товара: миниатюра, стрелка, счётчик', async () => {
  const page = await open(PRODUCT);
  const before = await page.getAttribute('.phero__main img', 'src');
  await page.locator('.phero__thumb').nth(1).click();
  const after = await page.getAttribute('.phero__main img', 'src');
  assert(before !== after, 'фото не сменилось');
  assert((await page.textContent('.phero__counter'))?.startsWith('2 /'), 'счётчик не обновился');
  await page.click('.phero__nav--next');
  assert((await page.textContent('.phero__counter'))?.startsWith('3 /'), 'стрелка не листает');
});

await check('просмотр фото на весь экран: открыть, листать, закрыть', async () => {
  const page = await open(PRODUCT);
  await page.click('.phero__main');
  await page.waitForSelector('#lightbox.is-open', { timeout: 3000 });
  const src1 = await page.getAttribute('#lb-img', 'src');
  await page.keyboard.press('ArrowRight');
  const src2 = await page.getAttribute('#lb-img', 'src');
  assert(src1 && src2 && src1 !== src2, 'кадр не листается');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#lightbox.is-open').count()), 'не закрылся');
});

await check('фильтр каталога: выбор значения скрывает карточки, сброс возвращает', async () => {
  const page = await open(CATALOG);
  const total = await page.locator('.pcard-grid .pcard').count();
  await page.locator('[data-cf-trigger]').first().click();
  const options = page.locator('[data-cf-dropdown].is-open [data-cf-option]');
  let hidden = 0;
  for (let i = 1; i < (await options.count()) && !hidden; i++) {
    await options.nth(i).click();
    hidden = await page.locator('.pcard-grid .pcard[hidden]').count();
    if (!hidden) await page.locator('[data-cf-trigger]').first().click();
  }
  assert(hidden > 0, 'ни один вариант не скрыл карточки');
  await page.click('[data-cf-reset]');
  assert((await page.locator('.pcard-grid .pcard[hidden]').count()) === 0, 'сброс не вернул карточки');
  return `${total} карточек, скрыто ${hidden}`;
});

await check('сравнение: кнопка в карточке и панель внизу', async () => {
  const page = await open(CATALOG);
  const btn = page.locator('.pcard [data-compare]').first();
  assert(await btn.count(), 'в карточках нет кнопки «К сравнению»');
  await btn.click();
  assert((await btn.textContent())?.includes('В сравнении'), 'кнопка не переключилась');
  await page.waitForSelector('#cmp-bar', { timeout: 3000 });
  assert((await page.textContent('#cmp-bar .cmp-bar__count'))?.includes('1'), 'панель не показывает выбор');
  await page.click('.cmp-bar__clear');
  assert(!(await page.locator('#cmp-bar').count()), 'панель не очистилась');
});

await check('«Запросить цену»: позиция в поле задачи формы', async () => {
  const page = await open(CATALOG);
  const btn = page.locator('.js-quote-btn').first();
  if (!(await btn.count())) return 'на странице нет кнопок — пропуск';
  const title = (await page.locator('.pcard').first().locator('.pcard__title').textContent())?.replace(/\s+/g, ' ').trim();
  await btn.click();
  const task = await page.locator('form[data-form] textarea[name="task"]').first().inputValue();
  assert(task.includes('Интересует'), `в поле задачи нет позиции: «${task.slice(0, 80)}»`);
  return title;
});

await check('маска телефона', async () => {
  const page = await open('/');
  await page.locator('.header-quick-form input[type="tel"]').pressSequentially('89001234567');
  const v = await page.inputValue('.header-quick-form input[type="tel"]');
  assert(v === '+7 (900) 123-45-67', `маска дала «${v}»`);
});

await check('согласие на cookie: плашка и «Принять»', async () => {
  const page = await open('/', { consent: false });
  await page.waitForSelector('#cookie-consent:not([hidden])', { timeout: 3000 });
  await page.click('#cookie-accept');
  assert(await page.locator('#cookie-consent[hidden]').count(), 'плашка не скрылась');
});

if (args.get('no-submit') !== 'true') {
  await check('заявка: отправка формы → «Спасибо»', async () => {
    const page = await open('/kontakty/');
    const form = page.locator('form[data-form]').filter({ has: page.locator('textarea[name="task"]') }).first();
    await form.scrollIntoViewIfNeeded();
    if (await form.locator('[name="name"]').count()) await form.locator('[name="name"]').fill('Проверка сайта (автотест)');
    await form.locator('input[type="tel"]').pressSequentially('9001234567');
    await form.locator('textarea[name="task"]').fill('Автотест новой версии сайта — не обрабатывать');
    for (const cb of await form.locator('input[type="checkbox"][required]').all()) await cb.check();
    await Promise.all([page.waitForURL(/\/spasibo\/|kontakty/, { timeout: 30000 }), form.locator('[type="submit"]').click()]);
    await page.waitForTimeout(6000);
    const url = page.url();
    const status = await form.locator('.js-form-status').textContent().catch(() => '');
    assert(url.includes('/spasibo/') || /принят|отправлен/i.test(status ?? ''), `нет подтверждения: ${url} «${status}»`);
    return url.includes('/spasibo/') ? 'переход на /spasibo/' : `статус: ${status}`;
  });
}

await browser.close();
for (const [name, ok, note] of results) console.log(`${ok ? '✓' : '✗'} ${name}${note ? ` — ${note}` : ''}`);
if (errors.length) console.log(`\nошибки JS:\n${errors.join('\n')}`);
console.log(`\n${results.filter((r) => r[1]).length} из ${results.length}`);
