import { chromium } from 'playwright';
const BASE = 'http://localhost:4322';
const URL = '/products/sistemy-ohlazhdeniya/chillery/uich-10/';
const browser = await chromium.launch();

for (const vw of [375, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 800 } });
  const page = await ctx.newPage();
  const log = (m) => console.log(`[${vw}px] ${m}`);
  await page.goto(BASE + URL, { waitUntil: 'networkidle' });

  // open lightbox via main photo
  await page.click('.phero__main');
  await page.waitForTimeout(200);
  let open = await page.evaluate(() => document.getElementById('lightbox')?.classList.contains('is-open'));
  log('open after click main: ' + open);

  // is the close button reachable / focus state
  const focusInside = await page.evaluate(() => document.getElementById('lightbox').contains(document.activeElement));
  log('focus moved into dialog: ' + focusInside);

  // counter + image src
  let state = await page.evaluate(() => ({ cur: document.getElementById('lb-current').textContent, total: document.getElementById('lb-total').textContent, src: document.getElementById('lb-img').getAttribute('src') }));
  log('counter ' + state.cur + '/' + state.total + ' src=' + state.src);

  // next via arrow key
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  state = await page.evaluate(() => ({ cur: document.getElementById('lb-current').textContent, src: document.getElementById('lb-img').getAttribute('src') }));
  log('after ArrowRight: ' + state.cur + ' src=' + state.src);

  // FOCUS TRAP test: Tab repeatedly, see if focus escapes dialog
  let escaped = false;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => document.getElementById('lightbox').contains(document.activeElement));
    if (!inside) { escaped = true; break; }
  }
  log('focus ESCAPES dialog on Tab: ' + escaped + (escaped ? '  <-- no focus trap' : ''));

  // close via Esc
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  open = await page.evaluate(() => document.getElementById('lightbox')?.classList.contains('is-open'));
  const bodyLocked = await page.evaluate(() => document.body.style.overflow);
  log('open after Esc: ' + open + ' | body.overflow="' + bodyLocked + '"');

  // focus restored?
  const restored = await page.evaluate(() => document.activeElement?.classList.contains('phero__main'));
  log('focus restored to trigger: ' + restored);

  await ctx.close();
}
await browser.close();
