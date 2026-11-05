import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { build, transform } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const marketing = path.resolve(web, '../../packages/ui/src/browser/marketing.ts');
const mangoName = 'mango-uibusiness-tracking-20261007-63dc454cb493.js';
const mangoCode = await fs.readFile(path.join(web, 'public/js', mangoName), 'utf8');
const require = createRequire(import.meta.url);

async function bundle(entry: string, define: Record<string, string> = {}) {
  const result = await build({
    absWorkingDir: web, entryPoints: [entry], bundle: true, write: false,
    platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react/jsx-runtime'], define,
  });
  return result.outputFiles[0].text;
}

const marketingCode = await bundle(marketing);
const formsCode = await bundle('src/client/forms.ts');
const legacyCode = (await transform(await fs.readFile(path.join(web, 'src/legacy/forms.ts'), 'utf8'), {
  loader: 'ts', format: 'iife', target: 'es2020',
})).code;
const siteScriptsCode = await bundle('src/components/SiteScripts.tsx', {
  'process.env.MTPK_STATIC_VERSIONS': JSON.stringify(JSON.stringify({ [`v:js/${mangoName}`]: 'test-content-hash' })),
});

const paid = (source = 'ya', campaign = 'AImarketing_715089929', clickId = '') =>
  `?utm_source=${source}&utm_medium=cpc&utm_campaign=${campaign}${clickId ? `&yclid=${clickId}` : ''}`;

function browser(search = paid(), consent = true) {
  const store = new Map<string, string>(consent ? [['ui_cookie_consent', '1|v2026.1|test']] : []);
  const cookies = new Map<string, string>();
  const events = new Map<string, Array<() => void>>();
  const timers = new Map<number, { at: number; fn: () => void }>();
  const ymCalls: unknown[][] = [];
  const callbacks: Array<(id: unknown) => void> = [];
  const scripts: Array<{ id?: string; src?: string }> = [];
  const requests: Array<{ body: FakeData }> = [];
  let now = 0;
  let nextTimer = 0;
  const setTimeout = (fn: () => void, ms = 0) => {
    timers.set(++nextTimer, { at: now + ms, fn });
    return nextTimer;
  };
  const clearTimeout = (id: number) => { timers.delete(id); };
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  const phone = { value: '70000000001', setAttribute() {}, removeAttribute() {} };
  const source = { value: '' };
  const submitHandlers: Array<(event: { preventDefault(): void }) => void> = [];
  const form = {
    dataset: {} as Record<string, string>,
    values: { phone: phone.value, source: 'test-form', task: 'test fixture' },
    querySelector: (selector: string) => selector === '[name="phone"]' ? phone : selector === '.js-form-source' ? source : null,
    getAttribute: (key: string) => key === 'data-form' ? 'quote' : null,
    setAttribute() {}, removeAttribute() {}, reportValidity: () => true,
    addEventListener: (name: string, fn: (event: { preventDefault(): void }) => void) => { if (name === 'submit') submitHandlers.push(fn); },
  };
  class FakeData {
    values: Map<string, string>;
    constructor(input?: typeof form) { this.values = new Map(Object.entries(input?.values ?? {})); }
    append(key: string, value: unknown) { this.values.set(key, String(value)); }
    set(key: string, value: unknown) { this.append(key, value); }
    get(key: string) { return this.values.get(key) ?? null; }
  }
  const location = { search, href: `https://uralinduktor.ru/${search}`, pathname: '/', host: 'uralinduktor.ru', hostname: 'uralinduktor.ru', protocol: 'https:', assign() {} };
  let status = '';
  const document = {
    readyState: 'complete', referrer: '', body: { appendChild: (script: { src?: string }) => scripts.push(script) },
    documentElement: { setAttribute: (_key: string, value: string) => { status = value; } },
    scripts, head: { appendChild: (script: { src?: string }) => scripts.push(script) },
    querySelectorAll: () => [form], getElementById: () => null,
    createElement: () => ({ src: '', id: '', async: false, addEventListener() {} }),
    addEventListener() {},
    get cookie() { return [...cookies].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('; '); },
    set cookie(value: string) { const [pair] = value.split(';'); const at = pair.indexOf('='); cookies.set(pair.slice(0, at), decodeURIComponent(pair.slice(at + 1))); },
  };
  const window = {
    location, setTimeout, clearTimeout, alert() {},
    crypto: { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) },
    addEventListener: (name: string, fn: () => void) => { const list = events.get(name) ?? []; list.push(fn); events.set(name, list); },
    ym: (...args: unknown[]) => { ymCalls.push(args); if (args[1] === 'getClientID') callbacks.push(args[2] as (id: unknown) => void); },
  };
  const env = { window, document, location, localStorage: storage, sessionStorage: storage, URLSearchParams, FormData: FakeData,
    setTimeout, clearTimeout, AbortController, console, alert() {},
    Date: class extends Date { static override now() { return now; } },
    fetch: async (_url: string, request: { body: FakeData }) => {
      requests.push(request);
      return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ ok: true, message: 'ok', receipt: request.body.get('request_id'), delivery: 'delivered' }) };
    },
  };
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  return {
    env, store, cookies, ymCalls, callbacks, scripts, requests,
    get status() { return status; },
    async advance(ms: number) {
      const target = now + ms;
      while (true) {
        const next = [...timers].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = Math.max(now, next[1].at); timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = target; await flush();
    },
    setNow(value: number) { now = value; },
    emit(name: string) { for (const fn of events.get(name) ?? []) fn(); },
    submit() { for (const fn of submitHandlers) fn({ preventDefault() {} }); },
    load(code: string) {
      const module = { exports: {} };
      runInNewContext(code, { ...env, module, exports: module.exports, require });
      return module.exports as { getMarketing(): Record<string, string>; reachGoal(name: string): void; appendAnalytics(fd: FakeData): Promise<void>; initForms(): void };
    },
    data() { return new FakeData(); },
  };
}

for (const source of ['ya', 'yandex', 'YA']) {
  test(`canonical paid ${source} and AImarketing goal without yclid`, () => {
    const b = browser(paid(source)); const m = b.load(marketingCode);
    assert.equal(m.getMarketing().utm_source, 'yandex');
    m.reachGoal('quote');
    assert.equal(b.ymCalls.find((c) => c[1] === 'reachGoal')?.[0], 112991420);
  });
}

test('numeric and named Direct campaigns keep legacy goals; other sources do not gain an account', () => {
  for (const [query, expected] of [[paid('ya', '714032894'), 25228307], [paid('google'), undefined], [paid('yandex', 'Mufelnye_pechi_SNOL_|_RF_|_Poisk'), 25228307], [paid('yandex', ''), undefined], ['?utm_source=yandex&utm_medium=organic&utm_campaign=714032894', undefined]] as const) {
    const b = browser(query); b.load(marketingCode).reachGoal('quote');
    assert.equal(b.ymCalls.find((c) => c[1] === 'reachGoal')?.[0], expected);
  }
});

test('a new campaign does not inherit an old yclid and saved ya is canonicalized', () => {
  const b = browser(paid()); b.store.set('ui_marketing_trace', JSON.stringify({ utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'AImarketing_old', yclid: '123456789012' }));
  assert.equal(b.load(marketingCode).getMarketing().yclid, undefined);
  const saved = browser(''); saved.store.set('ui_marketing_trace', JSON.stringify({ utm_source: 'ya', utm_medium: 'cpc', utm_campaign: 'AImarketing_saved' }));
  assert.equal(saved.load(marketingCode).getMarketing().utm_source, 'yandex');
  assert.equal(JSON.parse(saved.store.get('ui_marketing_trace')!).utm_source, 'yandex');
});

test('ClientID callback is awaited and takes precedence over cookie fallback', async () => {
  const b = browser(); b.cookies.set('_ym_uid', 'old-cookie'); const m = b.load(marketingCode); const fd = b.data();
  let done = false; const pending = Promise.resolve(m.appendAnalytics(fd)).then(() => { done = true; });
  await b.advance(25); assert.equal(done, false);
  b.callbacks.at(-1)!('fresh-client-id'); await pending;
  assert.equal(fd.get('_ym_uid'), 'fresh-client-id');
});

test('a silent counter has a bounded fallback', async () => {
  const b = browser(); b.cookies.set('_ym_uid', 'fallback'); const m = b.load(marketingCode); const fd = b.data();
  const pending = Promise.resolve(m.appendAnalytics(fd)); await b.advance(1000); await pending;
  assert.equal(fd.get('_ym_uid'), 'fallback');
});

test('ClientID does not wait for the cookie banner click', async () => {
  const b = browser(paid(), false); const m = b.load(marketingCode); const fd = b.data();
  const pending = m.appendAnalytics(fd);
  b.callbacks.at(-1)!('no-click-client-id'); await pending;
  assert.equal(fd.get('_ym_uid'), 'no-click-client-id');
});

test('late callback affects future forms without changing an already completed form', async () => {
  const b = browser(); const m = b.load(marketingCode); const first = b.data();
  const pending = m.appendAnalytics(first); await b.advance(1000); await pending;
  b.callbacks.at(-1)!('late-client-id');
  const next = b.data(); await m.appendAnalytics(next);
  assert.equal(first.get('_ym_uid'), null); assert.equal(next.get('_ym_uid'), 'late-client-id');
});

for (const mode of ['modern', 'legacy'] as const) {
  test(`${mode} form waits for ClientID before the fake request and routes ya to uibusiness`, async () => {
    const b = browser(paid()); const api = b.load(mode === 'modern' ? formsCode : legacyCode);
    if (mode === 'modern') api.initForms();
    b.setNow(4000); b.submit(); await b.advance(20);
    assert.equal(b.requests.length, 0);
    b.callbacks.at(-1)!('client-before-submit'); await b.advance(0);
    assert.equal(b.requests.length, 1);
    assert.equal(b.requests[0].body.get('_ym_uid'), 'client-before-submit');
    assert.equal(b.requests[0].body.get('utm_source'), 'yandex');
    assert.equal(b.ymCalls.find((c) => c[1] === 'reachGoal')?.[0], 112991420);
  });
  test(`${mode} form sends ClientID without the cookie banner click`, async () => {
    const b = browser(paid(), false); const api = b.load(mode === 'modern' ? formsCode : legacyCode);
    if (mode === 'modern') api.initForms();
    b.setNow(4000); b.submit(); await b.advance(20);
    b.callbacks.at(-1)!('no-click-client-id'); await b.advance(0);
    assert.equal(b.requests.length, 1);
    assert.equal(b.requests[0].body.get('_ym_uid'), 'no-click-client-id');
  });
  test(`${mode} form still submits when the counter never responds`, async () => {
    const b = browser(); const api = b.load(mode === 'modern' ? formsCode : legacyCode);
    if (mode === 'modern') api.initForms();
    b.setNow(4000); b.submit(); await b.advance(1000);
    assert.equal(b.requests.length, 1);
  });
  test(`${mode} form preserves numeric/named legacy campaigns and does not attribute other sources`, async () => {
    for (const [query, expected] of [[paid('ya', '714032894'), 25228307], [paid('google'), undefined], [paid('yandex', 'Termicheskie_pechi_|_MSK_SZ_|_Poisk'), 25228307], [paid('yandex', ''), undefined]] as const) {
      const b = browser(query); const api = b.load(mode === 'modern' ? formsCode : legacyCode);
      if (mode === 'modern') api.initForms();
      b.setNow(4000); b.submit(); await b.advance(1000);
      assert.equal(b.requests.length, 1);
      assert.equal(b.ymCalls.find((c) => c[1] === 'reachGoal')?.[0], expected);
    }
  });
}

for (const source of ['ya', 'yandex']) {
  test(`actual Mango controller accepts paid ${source} after consent`, () => {
    const b = browser(paid(source)); b.load(mangoCode);
    assert.equal(b.scripts.length, 1); assert.equal(b.scripts[0].src, 'https://widgets.mango-office.ru/site/39812');
  });
}

test('Mango retains consent, host, medium and duplicate-parameter restrictions', () => {
  const denied = browser(paid(), false); denied.load(mangoCode); assert.equal(denied.scripts.length, 0);
  denied.store.set('ui_cookie_consent', '1|v2026.1|test'); denied.emit('cookie-consent-accepted'); assert.equal(denied.scripts.length, 1);
  for (const query of ['?utm_source=ya&utm_medium=organic&utm_campaign=AImarketing_x', `${paid()}&utm_source=yandex`]) {
    const b = browser(query); b.load(mangoCode); assert.equal(b.scripts.length, 0);
  }
  const host = browser(); host.env.location.hostname = 'other.example'; host.load(mangoCode); assert.equal(host.scripts.length, 0);
  const numeric = browser(paid('ya', '714032894')); numeric.load(mangoCode); assert.equal(numeric.scripts.length, 1);
});

test('outer Mango gate allows ya and uses the generated content version', () => {
  const module = { exports: {} as { SiteScripts: (props: { modules: string[]; legacy: string[] }) => Parameters<typeof renderToStaticMarkup>[0] } };
  runInNewContext(siteScriptsCode, { module, exports: module.exports, require, process: { env: {} } });
  const html = renderToStaticMarkup(module.exports.SiteScripts({ modules: [], legacy: [] }));
  const gate = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];
  const b = browser(paid()); b.load(gate);
  assert.equal(b.scripts.length, 1);
  assert.equal(b.scripts[0].src, `/js/${mangoName}?v=test-content-hash`);
});
