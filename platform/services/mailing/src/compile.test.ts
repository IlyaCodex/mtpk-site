import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignUtm, compileCampaign, personalize, textVersion, utmSlug, withUtm } from './compile.ts';

const OWN = ['uralinduktor.ru', '127.0.0.1:3200'];

test('метки: транслит, дата', () => {
  assert.equal(utmSlug('Запросить КП →'), 'zaprosit-kp');
  assert.equal(utmSlug('Смотреть каталог (15 направлений)'), 'smotret-katalog-15-napravleniy');
  assert.equal(campaignUtm('Новинки октября', new Date(2026, 9, 13)), '2026-10-novinki-oktyabrya');
});

test('UTM — только на свои сайты, свои метки не перезаписываются', () => {
  const own = new URL(withUtm('https://uralinduktor.ru/products/?utm_source=partner', { campaign: 'c1', content: 'btn' }, OWN));
  assert.equal(own.searchParams.get('utm_source'), 'partner');
  assert.equal(own.searchParams.get('utm_medium'), 'email');
  assert.equal(own.searchParams.get('utm_campaign'), 'c1');
  assert.equal(own.searchParams.get('utm_content'), 'btn');
  assert.equal(withUtm('https://t.me/uralinduktor', { campaign: 'c1', content: 'tg' }, OWN), 'https://t.me/uralinduktor');
});

test('письмо: ссылки — {{link:N}}, почта, отписка и data-notrack не трогаются, повтор метки — с номером', () => {
  const html =
    '<body><a href="{{site_url}}/products/" class="btn">Каталог</a> <a href="https://uralinduktor.ru/kontakty/">Каталог</a>' +
    ' <a href="mailto:info@uralinduktor.ru">почта</a> <a href="{{unsubscribe_url}}">Отписаться</a>' +
    ' <a data-notrack href="https://uralinduktor.ru/">лого</a> <a href="https://uralinduktor.ru/x" data-utm="spec-offer"><img alt="Баннер"></a></body>';
  const r = compileCampaign(html, { utmCampaign: '2026-10-test', ownHosts: OWN, publicUrl: 'http://127.0.0.1:3200', preheader: 'Новинки' });
  assert.equal(r.links.length, 3);
  assert.deepEqual(
    r.links.map((l) => l.utmContent),
    ['katalog', 'katalog-2', 'spec-offer'],
  );
  assert.equal(r.links[0]!.url, 'http://127.0.0.1:3200/products/');
  assert.match(r.links[0]!.target, /utm_campaign=2026-10-test/);
  assert.match(r.html, /href="\{\{link:1\}\}"/);
  assert.match(r.html, /href="mailto:info@uralinduktor.ru"/);
  assert.match(r.html, /href="\{\{unsubscribe_url\}\}"/);
  assert.match(r.html, /data-notrack href="https:\/\/uralinduktor.ru\/"/);
  assert.match(r.html, /^<body>\n<div style="display:none/);
});

test('получатель: ссылки отслеживания, отписка, имя, пиксель', () => {
  const tpl = '<body>Здравствуйте, {{name|коллеги}}! <a href="{{link:1}}">Каталог</a> <a href="{{unsubscribe_url}}">x</a></body>';
  const p = { token: 'a'.repeat(32), email: 'i@a.ru', linkIds: new Map([[1, 77]]), publicUrl: 'https://uralinduktor.ru' };
  const named = personalize(tpl, { ...p, name: 'Иван <b>', pixel: true });
  assert.match(named, /Здравствуйте, Иван &lt;b&gt;!/);
  assert.match(named, /href="https:\/\/uralinduktor.ru\/r\/c\/77\/a{32}"/);
  assert.match(named, /href="https:\/\/uralinduktor.ru\/r\/u\/a{32}"/);
  assert.match(named, /<img src="https:\/\/uralinduktor.ru\/r\/o\/a{32}\.gif"[^>]*><\/body>/);
  assert.match(personalize(tpl, { ...p, name: null }), /Здравствуйте, коллеги!/);
});

test('текстовая версия: абзацы и ссылки «текст (адрес)»', () => {
  const t = textVersion('<p>Привет&nbsp;мир</p><p><a href="https://x.ru/">Каталог</a></p>');
  assert.equal(t, 'Привет мир\nКаталог (https://x.ru/)');
});
