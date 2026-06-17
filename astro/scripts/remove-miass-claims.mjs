// Удаляет гео-claim «производство в Миассе» в указанных разделах.
// Логистику («склад/ЗИП в Миассе», адрес) НЕ трогает.
// Запуск: node astro/scripts/remove-miass-claims.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'astro/src/raw-pages/products';
const DIRS = [
  'induktsionnye-nagrevateli',
  'linii-dlya-holodnotverdeyushhih-smesej-hts',
  'mufelnye-termicheskie-pechi',
  'sistemy-ohlazhdeniya/chillery',
  'stalerozlivochnye-kovshi',
  'vakuumnoe-oborudovanie-dlya-termoobrabotki',
  'oborudovanie-dlya-peschano-glinistyh-smesej-pgs',
];

// Литеральные замены [искомое, замена]
const REPLACEMENTS = [
  ['изготавливаем в&nbsp;Миассе,', 'изготавливаем,'],
  ['<h3 class="cycle-step__title">Производство в&nbsp;Миассе</h3>', '<h3 class="cycle-step__title">Производство</h3>'],
  ['Собственное производство в&nbsp;Миассе позволяет контролировать качество на&nbsp;всех этапах.', 'Контроль качества на&nbsp;всех этапах поставки.'],
  ['с&nbsp;учётом нашего собственного производства и&nbsp;складской базы ЗИП в&nbsp;Миассе', 'с&nbsp;учётом нашей сервисной базы и&nbsp;склада ЗИП в&nbsp;Миассе'],
  // meta.json (без &nbsp;)
  ['Собственное производство в Миассе, гарантия 18 месяцев.', 'Гарантия 18 месяцев.'],
];

// Собираем список файлов в целевых каталогах
const files = execSync(
  `find ${DIRS.map((d) => `${ROOT}/${d}`).join(' ')} -type f \\( -name body.html -o -name meta.json \\)`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

let total = 0;
const touched = [];
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  let n = 0;
  for (const [from, to] of REPLACEMENTS) {
    const parts = src.split(from);
    if (parts.length > 1) {
      n += parts.length - 1;
      src = parts.join(to);
    }
  }
  if (n > 0) {
    writeFileSync(f, src);
    touched.push(`${n}  ${f.replace('astro/src/raw-pages/products/', '')}`);
    total += n;
  }
}

console.log(touched.sort().join('\n'));
console.log(`\nФайлов изменено: ${touched.length}, замен всего: ${total}`);

// Контроль: остались ли claim-формы в целевых каталогах
const leftover = execSync(
  `grep -rl 'изготавливаем в&nbsp;Миассе\\|cycle-step__title">Производство в&nbsp;Миассе\\|Собственное производство в&nbsp;Миассе\\|собственного производства и&nbsp;складской\\|Собственное производство в Миассе,' ${DIRS.map((d) => `${ROOT}/${d}`).join(' ')} 2>/dev/null || true`,
  { encoding: 'utf8' }
).trim();
console.log(leftover ? `\n⚠ Остались claim в:\n${leftover}` : '\n✓ claim-форм в целевых каталогах не осталось');
