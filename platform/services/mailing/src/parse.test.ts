import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { contactsFromText, decodeText, normalizeEmail, parseContactsFile } from './parse.ts';

test('адрес: регистр, mailto, кириллический домен, ошибки', () => {
  assert.equal(normalizeEmail('  Ivan.Petrov@Mail.RU '), 'ivan.petrov@mail.ru');
  assert.equal(normalizeEmail('mailto:sales@uralinduktor.ru'), 'sales@uralinduktor.ru');
  assert.equal(normalizeEmail('info@завод.рф'), 'info@завод.рф');
  assert.equal(normalizeEmail('bad@'), null);
  assert.equal(normalizeEmail('a..b@mail.ru'), null);
  assert.equal(normalizeEmail('нет-адреса'), null);
});

test('текст: адрес на строку, «Имя <адрес>», повторы и ошибки', () => {
  const r = contactsFromText('ivan@a.ru\nПётр Иванов <petr@b.ru>\nbad@x\nIVAN@a.ru\n\nanna@c.ru, oleg@d.ru');
  assert.deepEqual(
    r.contacts.map((c) => c.email),
    ['ivan@a.ru', 'petr@b.ru', 'anna@c.ru', 'oleg@d.ru'],
  );
  assert.equal(r.contacts[1]!.name, 'Пётр Иванов');
  assert.equal(r.duplicates, 1);
  assert.equal(r.invalid, 1);
});

test('CSV с заголовками: имя, компания, телефон по колонкам', () => {
  const csv = 'ФИО;Компания;E-mail;Телефон\n"Иванов Иван";"ООО ""Литейщик""";ivan@lit.ru;+7 900 000-00-00\nПетров;Завод;petr@zavod.ru;\n';
  const r = parseContactsFile('base.csv', strToU8(csv));
  assert.equal(r.contacts.length, 2);
  assert.deepEqual(r.contacts[0], { email: 'ivan@lit.ru', name: 'Иванов Иван', company: 'ООО "Литейщик"', phone: '+7 900 000-00-00' });
});

test('Windows-1251 (выгрузка из 1С) читается', () => {
  // «Иван;ivan@a.ru» в Windows-1251
  const buf = new Uint8Array([0xc8, 0xe2, 0xe0, 0xed, 0x3b, ...strToU8('ivan@a.ru')]);
  assert.equal(decodeText(buf), 'Иван;ivan@a.ru');
  const r = parseContactsFile('base.txt', buf);
  assert.deepEqual(r.contacts, [{ email: 'ivan@a.ru', name: 'Иван', company: undefined, phone: undefined }]);
});

test('.xlsx: общие строки, ячейки по колонкам, заголовок', () => {
  const shared = '<sst><si><t>Имя</t></si><si><t>Email</t></si><si><t>Анна</t></si><si><r><t>anna</t></r><r><t>@zavod.ru</t></r></si></sst>';
  const sheet =
    '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>' +
    '<row r="3"><c r="B3" t="inlineStr"><is><t>boris@mail.ru</t></is></c></row>' +
    '</sheetData></worksheet>';
  const xlsx = zipSync({ 'xl/sharedStrings.xml': strToU8(shared), 'xl/worksheets/sheet1.xml': strToU8(sheet) });
  const r = parseContactsFile('base.xlsx', xlsx);
  assert.deepEqual(
    r.contacts.map((c) => [c.email, c.name]),
    [
      ['anna@zavod.ru', 'Анна'],
      ['boris@mail.ru', undefined],
    ],
  );
});

test('.xls из Битрикс24 (HTML-таблица)', () => {
  const html = '<html><body><table><tr><th>Имя</th><th>E-mail</th></tr><tr><td>Олег</td><td>oleg@b24.ru</td></tr><tr><td>Нина</td><td>nina@b24.ru, nina2@b24.ru</td></tr></table></body></html>';
  const r = parseContactsFile('crm.xls', strToU8(html));
  assert.deepEqual(
    r.contacts.map((c) => [c.email, c.name]),
    [
      ['oleg@b24.ru', 'Олег'],
      ['nina@b24.ru', 'Нина'],
      ['nina2@b24.ru', 'Нина'],
    ],
  );
});
