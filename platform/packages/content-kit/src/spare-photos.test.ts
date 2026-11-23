import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Block } from '@mtpk/content-model';
import { hasSpareCards, sparePhoto, sparePhotoOfBlocks, SPARE_PLACEHOLDER, syncSpareCardBlocks, syncSpareCards } from './spare-photos.ts';

const PAGE_PHOTO =
  '<div class="product-visual"><button class="product-photo" data-zoom="/img/zapchasti/drobemetnoe/blade-09.jpg" data-alt="Лопатки — иллюстрация" aria-label="Увеличить изображение">' +
  '<img src="/img/zapchasti/drobemetnoe/blade-09.jpg" alt="Лопатки — иллюстрация" width="866" height="1144" loading="eager" decoding="async"></button></div>';
const PAGE_EMPTY = `<div class="product-visual"><button class="product-photo" disabled="">${SPARE_PLACEHOLDER}</button></div>`;
const BLADES = '/products/zapchasti/drobemetnoe/lopatki-7-5/';
const LINER = '/products/zapchasti/drobemetnoe/vkladysh/';

test('фото со страницы детали: картинка с размером, заглушка — null, нет блока фото — undefined', () => {
  assert.deepEqual(sparePhoto(PAGE_PHOTO), { src: '/img/zapchasti/drobemetnoe/blade-09.jpg', alt: 'Лопатки — иллюстрация', width: '866', height: '1144' });
  assert.equal(sparePhoto(PAGE_EMPTY), null);
  assert.equal(sparePhoto('<p>Тиристор</p>'), undefined);
  assert.deepEqual(sparePhotoOfBlocks([{ type: 'html', html: '<p>шапка</p>' }, { type: 'html', html: PAGE_PHOTO }]), sparePhoto(PAGE_PHOTO));
});

test('карточки деталей: фото со страницы детали, у детали без фото — заглушка, чужие ссылки — как есть', () => {
  const photo = sparePhoto(PAGE_PHOTO)!;
  const photos = (href: string) => (href === BLADES ? photo : href === LINER ? null : undefined);
  const card = (href: string, inner: string) => `<a class="card-image" href="${href}">${inner}</a>`;
  const img = '<img src="/img/zapchasti/drobemetnoe/blade-09.jpg" alt="Лопатки — иллюстрация" width="866" height="1144" loading="lazy" decoding="async">';
  // уже совпадает — строка та же
  const same = card(BLADES, img);
  assert.equal(syncSpareCards(same, photos), same);
  // фото появилось на странице — в карточке вместо заглушки
  assert.equal(syncSpareCards(card(BLADES, SPARE_PLACEHOLDER), photos), same);
  // фото убрали со страницы — в карточке заглушка
  assert.equal(syncSpareCards(card(LINER, '<img src="/img/old.jpg" alt="">'), photos), card(LINER, SPARE_PLACEHOLDER));
  // неизвестная страница — не трогаем
  const other = card('/products/zapchasti/drobemetnoe/', '<img src="/img/x.jpg" alt="x">');
  assert.equal(syncSpareCards(other, photos), other);
  // в блоках: HTML-секции и вложенные, код секции не трогается
  const blocks = [{ type: 'html', html: `<div class="product-card">${card(BLADES, SPARE_PLACEHOLDER)}</div>`, css: '.card-image{}' }] as unknown as Block[];
  assert.ok(hasSpareCards(blocks));
  assert.equal((syncSpareCardBlocks(blocks, photos)[0] as { html: string }).html, `<div class="product-card">${same}</div>`);
  assert.equal(hasSpareCards([{ type: 'html', html: '<p>нет карточек</p>' }]), false);
});
