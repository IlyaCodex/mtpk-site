// Заменяет невидимые символы (неразрывный пробел, word joiner, мягкий перенос
// и т.п.) в исходниках TS/TSX на явную запись \uXXXX — в строках и регулярках
// это то же самое значение, но в редакторе символ видно.
// Запуск: npx tsx scripts/escape-nbsp.ts <файлы…>
import fs from 'node:fs';

const INVISIBLE = [0x00a0, 0x2009, 0x2002, 0x2003, 0x2060, 0x200b, 0x00ad, 0x2010, 0x2011, 0x2012];
for (const file of process.argv.slice(2)) {
  let src = fs.readFileSync(file, 'utf8');
  let total = 0;
  for (const code of INVISIBLE) {
    const ch = String.fromCharCode(code);
    const n = src.split(ch).length - 1;
    if (!n) continue;
    total += n;
    src = src.split(ch).join(`\\u${code.toString(16).toUpperCase().padStart(4, '0')}`);
  }
  if (total) {
    fs.writeFileSync(file, src);
    console.log(`${file}: ${total}`);
  }
}
