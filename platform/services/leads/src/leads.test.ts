import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Lead } from '@mtpk/db';
import { clean, isTooFast, originAllowed, pageUrlFrom, parseLead, validateLead } from './fields.ts';
import { checkAttachment, sniff } from './attachment.ts';
import { adAccount, bitrixLeadFields, emailBody, phpBuildQuery } from './messages.ts';

const HOSTS = ['uralinduktor.ru', 'new.uralinduktor.ru'];

test('clean: обрезка, без \\r и \\0, по символам (не байтам)', () => {
  assert.equal(clean('  Иван\r\0  '), 'Иван');
  assert.equal(clean('абвгд', 3), 'абв');
  assert.equal(clean(undefined), '');
});

test('валидация телефона и email — правила send.php', () => {
  const base = parseLead({ phone: '+7 (351) 211-65-97', name: 'Иван' });
  assert.equal(validateLead(base), null);
  assert.equal(validateLead(parseLead({ phone: '12-34' })), 'Укажите корректный телефон');
  assert.equal(validateLead(parseLead({ phone: '+79990001122', email: 'не почта' })), 'Некорректный email');
});

test('антиспам по времени: 0…3 с — бот, отрицательное время — не бот', () => {
  const now = 1_000_000;
  assert.equal(isTooFast(String(now - 1000), now), 1000);
  assert.equal(isTooFast(String(now - 5000), now), null);
  assert.equal(isTooFast(String(now + 60_000), now), null); // часы клиента спешат
  assert.equal(isTooFast(undefined, now), null);
});

test('origin: пустой — пропускаем, чужой — нет', () => {
  assert.equal(originAllowed(undefined, undefined, HOSTS), true);
  assert.equal(originAllowed('https://uralinduktor.ru', undefined, HOSTS), true);
  assert.equal(originAllowed(undefined, 'https://evil.example/x', HOSTS), false);
  assert.equal(pageUrlFrom('https://new.uralinduktor.ru/products/', HOSTS), 'https://uralinduktor.ru/products/');
});

test('трейс Битрикс24 и метки UTM', () => {
  const l = parseLead({ phone: '79990001122', b24_trace: '{"a":1}', utm_source: 'yandex', utm_campaign: 'AImarketing_x', part: 'Тиристор' });
  assert.equal(l.b24TraceValid, true);
  assert.deepEqual(l.utm, { utm_source: 'yandex', utm_campaign: 'AImarketing_x' });
  assert.deepEqual(l.fields, { part: 'Тиристор' });
  assert.equal(adAccount(l.utm), 'uibusiness');
  assert.equal(adAccount({ utm_campaign: 'brand', utm_source: 'yandex' }), 'УралИндуктор3');
});

test('вложение: тип проверяется по содержимому, не по имени', () => {
  const pdf = Buffer.from('%PDF-1.7 test');
  assert.equal(sniff(pdf), 'pdf');
  assert.deepEqual(checkAttachment('КП.pdf', pdf, false), { ok: true, name: 'КП.pdf' });
  const fake = checkAttachment('virus.pdf', Buffer.from('MZ\x90\x00'), false);
  assert.equal(fake.ok, false);
  assert.equal(checkAttachment('big.pdf', pdf, true).ok, false);
});

test('http_build_query как в PHP: вложенные поля лида', () => {
  const q = phpBuildQuery({ fields: { TITLE: 'A B', PHONE: [{ VALUE: '+7', VALUE_TYPE: 'WORK' }] } });
  assert.equal(q, 'fields%5BTITLE%5D=A%20B&fields%5BPHONE%5D%5B0%5D%5BVALUE%5D=%2B7&fields%5BPHONE%5D%5B0%5D%5BVALUE_TYPE%5D=WORK');
});

test('письмо и лид Б24 содержат всё нужное менеджеру', () => {
  const lead = {
    id: 42,
    createdAt: new Date('2026-10-06T07:00:00Z'),
    phone: '+79990001122',
    name: 'Иван',
    email: 'ivan@example.com',
    task: 'Печь 1 т',
    fields: { model: 'УИ-1Т' },
    utm: { utm_source: 'yandex', utm_campaign: 'brand' },
    pageUrl: 'https://uralinduktor.ru/products/',
    source: 'Подбор и расчёт · /products/',
    consent: 'v2026.1',
    b24Trace: null,
    b24TraceValid: false,
    ymUid: '123',
    ip: '1.2.3.4',
    attachmentName: null,
    attachmentNote: null,
  } as unknown as Lead;
  const body = emailBody(lead);
  for (const s of ['Телефон: +79990001122', 'Имя: Иван', 'Задача: Печь 1 т', 'Модель: УИ-1Т', 'Страница: https://uralinduktor.ru/products/', 'utm_source: yandex', 'Время: 2026-10-06 12:00:00']) {
    assert.ok(body.includes(s), `в письме нет «${s}»`);
  }
  const f = bitrixLeadFields(lead, 'UF_CRM_YA_CID');
  assert.equal(f.TITLE, 'Заявка с сайта — Иван · +79990001122');
  assert.equal(f.UTM_SOURCE, 'yandex');
  assert.equal(f.UF_CRM_YA_CID, '123');
  assert.equal(f.SOURCE_DESCRIPTION, 'Яндекс Директ — УралИндуктор3');
});
