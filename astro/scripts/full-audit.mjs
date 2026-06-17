import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:4322';
const urls = readFileSync('/tmp/audit-urls.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const BREAKPOINTS = [360, 768, 1024, 1440];

const browser = await chromium.launch();
const report = { overflow: {}, a11y: {}, cookies: {}, cookieBanner: {} };

// ---------- 1. RESPONSIVE OVERFLOW at 4 breakpoints ----------
for (const w of BREAKPOINTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const url of urls) {
    try {
      await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(120);
      const data = await page.evaluate((vw) => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const offenders = [];
        if (overflow > 2) {
          for (const el of document.body.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.right > vw + 2) {
              const st = getComputedStyle(el);
              if (st.position === 'fixed') continue;
              offenders.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50), right: Math.round(r.right), w: Math.round(r.width) });
            }
          }
          offenders.sort((a, b) => b.right - a.right);
        }
        return { overflow, top: offenders.slice(0, 4) };
      }, w);
      if (data.overflow > 2) {
        (report.overflow[url] ||= {})[w] = data;
        console.log(`[OVERFLOW ${w}px +${data.overflow}] ${url}`);
        for (const o of data.top.slice(0, 2)) console.log(`     <${o.tag} class="${o.cls}"> right=${o.right} w=${o.w}`);
      }
    } catch (e) { console.log(`[ERR ${w}] ${url}: ${e.message.split('\n')[0]}`); }
  }
  await ctx.close();
}

// ---------- 2. A11Y STRUCTURAL PROBE (at 1280) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  for (const url of urls) {
    try {
      await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 25000 });
      const a = await page.evaluate(() => {
        const out = { imgNoAlt: [], emptyLink: [], emptyBtn: [], inputNoLabel: [], h1count: 0, headingJumps: [], dupIds: [], lang: document.documentElement.lang || '(none)', viewportZoom: null };
        document.querySelectorAll('img').forEach(i => { if (!i.hasAttribute('alt')) out.imgNoAlt.push(i.getAttribute('src') || ''); });
        document.querySelectorAll('a').forEach(el => {
          const name = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.querySelector('img[alt]')?.getAttribute('alt') || el.getAttribute('title');
          if (!name && el.offsetParent !== null) out.emptyLink.push((el.getAttribute('href') || '').slice(0, 50));
        });
        document.querySelectorAll('button').forEach(el => {
          const name = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.querySelector('img[alt]')?.getAttribute('alt') || el.getAttribute('title');
          if (!name) out.emptyBtn.push((el.className || '').slice(0, 50));
        });
        document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea').forEach(el => {
          const id = el.id;
          const hasLabel = (id && document.querySelector(`label[for="${id}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || el.getAttribute('placeholder');
          if (!hasLabel) out.inputNoLabel.push((el.name || el.type || '').slice(0, 40));
        });
        const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
        out.h1count = hs.filter(n => n === 1).length;
        for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) out.headingJumps.push(`h${hs[i - 1]}→h${hs[i]}`);
        const ids = {};
        document.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
        out.dupIds = Object.entries(ids).filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
        const vp = document.querySelector('meta[name=viewport]')?.content || '';
        out.viewportZoom = /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\D|$)/.test(vp) ? 'BLOCKED:' + vp : 'ok';
        return out;
      });
      report.a11y[url] = a;
    } catch (e) { console.log(`[A11Y ERR] ${url}: ${e.message.split('\n')[0]}`); }
  }
  await ctx.close();
}

// ---------- 3. COOKIE / CONSENT ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(500);
  // trigger analytics by scrolling (analytics defers to idle/interaction)
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(2500);
  const cookies = await ctx.cookies();
  report.cookies = cookies.map(c => ({ name: c.name, domain: c.domain }));
  report.cookieBanner.found = await page.evaluate(() => {
    const txt = document.body.innerText.toLowerCase();
    const hasText = /cookie|куки|использ.{0,15}файл/.test(txt) && /(приня|соглас|ок\b|понятно|разреш)/.test(txt);
    const el = document.querySelector('[class*=cookie],[id*=cookie],[class*=consent],[id*=consent]');
    return { textHeuristic: hasText, elementFound: !!el };
  });
  await ctx.close();
}

await browser.close();
writeFileSync('/tmp/full-audit.json', JSON.stringify(report, null, 2));

// ---------- SUMMARY ----------
console.log('\n\n===== A11Y SUMMARY =====');
for (const [url, a] of Object.entries(report.a11y)) {
  const flags = [];
  if (a.imgNoAlt.length) flags.push(`imgNoAlt=${a.imgNoAlt.length}`);
  if (a.emptyLink.length) flags.push(`emptyLink=${a.emptyLink.length}`);
  if (a.emptyBtn.length) flags.push(`emptyBtn=${a.emptyBtn.length}`);
  if (a.inputNoLabel.length) flags.push(`inputNoLabel=${a.inputNoLabel.length}`);
  if (a.h1count !== 1) flags.push(`h1count=${a.h1count}`);
  if (a.headingJumps.length) flags.push(`headingJumps=${a.headingJumps.join(',')}`);
  if (a.dupIds.length) flags.push(`dupIds=${a.dupIds.join(',')}`);
  if (a.viewportZoom !== 'ok') flags.push(a.viewportZoom);
  if (a.lang !== 'ru') flags.push(`lang=${a.lang}`);
  if (flags.length) console.log(`${url}\n   ${flags.join(' | ')}`);
}
console.log('\n===== COOKIES SET (no consent) =====');
console.log(report.cookies.map(c => c.name).join(', ') || '(none)');
console.log('cookie banner:', JSON.stringify(report.cookieBanner.found));
console.log('\n===== OVERFLOW pages =====', Object.keys(report.overflow).length);
