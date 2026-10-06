/**
 * Из сгенерированных эталонов (packages/blocks/src/generated) собирает итоговые
 * компоненты блоков с параметрами. Запуск: npx tsx tools/codegen/src/finalize-blocks.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORM } from './legacy-dist.ts';

const SRC = path.join(PLATFORM, 'packages', 'blocks', 'src');
const BS = '\\'; // обратная косая черта: в сгенерированных файлах NBSP записан как
const NB = `${BS}u00A0`;

const gen = (n: string) => fs.readFileSync(path.join(SRC, 'generated', `${n}.tsx`), 'utf8');
const body = (src: string) => src.slice(src.indexOf('  return ('));

function write(name: string, header: string[], signature: string, src: string, replaces: [string, string][] = []) {
  let b = body(src);
  for (const [from, to] of replaces) {
    if (!b.includes(from)) throw new Error(`${name}: не найдено ${from}`);
    b = b.split(from).join(to);
  }
  fs.mkdirSync(path.join(SRC, 'blocks'), { recursive: true });
  fs.writeFileSync(path.join(SRC, 'blocks', `${name}.tsx`), `${header.map((l) => `// ${l}`).join('\n')}\n${signature}\n${b}`);
}

const note = [
  'Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen) и совпадает',
  'с ней до пробела: пробелы между тегами влияют на отрисовку inline-элементов.',
];

write('Leadgen', ['Блок заявки «Подбор и расчёт» (маркер leadgen) — из Leadgen.astro.', ...note,
  'Форму обслуживает public/js/forms.js (класс js-lead-form) → сервис заявок.'],
  'export function Leadgen() {', gen('Leadgen'));
write('CatalogCta', ['Блок «Каталог / запрос КП» (маркер catalog-cta) — из CatalogCta.astro.', ...note],
  'export function CatalogCta() {', gen('CatalogCta'));
write('Partner', ['Блок «Партнёры / лизинг» (маркер partner) — из Partner.astro.', ...note],
  'export function Partner() {', gen('Partner'));
write('Adv', ['Блок «Преимущества собственного производства» (маркеры adv, adv-12, adv-chiller) — из Adv.astro.', ...note,
  'warranty — срок гарантии в заголовке: 18 месяцев по умолчанию, 12 — у чиллеров и транзисторных печей.'],
  `export function Adv({ warranty = '18${NB}месяцев' }: { warranty?: string }) {`, gen('Adv'),
  [[`{"расширенная гарантия 18${NB}месяцев"}`, '{`расширенная гарантия ${warranty}`}']]);
write('WhyUs', ['Блок «Почему мы» (маркеры why-us, why-us-12, why-us-6) — из WhyUs.astro.', ...note,
  'months — срок гарантии: 18 по умолчанию, 12 и 6 — в разделах с другой гарантией.'],
  'export function WhyUs({ months = 18 }: { months?: number }) {', gen('WhyUs'),
  [[`{"Гарантия 18${NB}месяцев на${NB}собственное производство. Постгарантийное обслуживание, запчасти и${NB}сервис — на${NB}постоянной основе."}`,
    `{\`Гарантия \${months}${NB}месяцев на${NB}собственное производство. Постгарантийное обслуживание, запчасти и${NB}сервис — на${NB}постоянной основе.\`}`]]);
write('BestOffer', ['Блок «Лучшее коммерческое предложение» (маркер best-offer) — короткая форма заявки, из BestOffer.astro.', ...note,
  'anchorId — якорь секции: leadgen, если отдельного блока заявки на странице нет (на него ведут',
  'кнопки «Обсудить задачу»), иначе best-offer — чтобы не было двух id=leadgen.'],
  "export function BestOffer({ anchorId = 'leadgen' }: { anchorId?: string }) {", gen('BestOfferV2'),
  [['<section className="best-offer" id="leadgen"', '<section className="best-offer" id={anchorId}']]);

console.log(fs.readdirSync(path.join(SRC, 'blocks')));
