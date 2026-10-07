// Показывает и убирает управляющие символы (кроме \t \n \r) в исходниках —
// следы неудачного экранирования. Запуск: npx tsx scripts/fix-control-chars.ts <файлы…>
import fs from 'node:fs';

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  const bad = [...src.matchAll(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g)];
  if (!bad.length) continue;
  console.log(`${file}: ${bad.length} управляющих символов (${[...new Set(bad.map((m) => m[0].charCodeAt(0)))].join(',')})`);
  // \x08 (backspace) здесь всегда — несостоявшийся \b в регулярке
  fs.writeFileSync(file, src.replace(/\x08/g, '\\b'));
}
