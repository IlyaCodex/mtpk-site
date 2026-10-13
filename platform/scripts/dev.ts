/**
 * Локальная разработка: все сервисы и сайт одной командой, с цветными
 * префиксами в выводе. Хранилища (Postgres, Redis, MinIO) — в Docker:
 * npm run infra:up. Docker-образы сервисов при этом НЕ собираются.
 *
 *   npm run dev                 — всё
 *   npm run dev -- web content  — выборочно
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';

const PROCS: Record<string, [string, string[]]> = {
  content: ['npm', ['run', 'dev', '-w', '@mtpk/content-service']],
  media: ['npm', ['run', 'dev', '-w', '@mtpk/media-service']],
  leads: ['npm', ['run', 'dev', '-w', '@mtpk/leads-service']],
  'leads-worker': ['npm', ['run', 'dev:worker', '-w', '@mtpk/leads-service']],
  mailing: ['npm', ['run', 'dev', '-w', '@mtpk/mailing-service']],
  'mailing-worker': ['npm', ['run', 'dev:worker', '-w', '@mtpk/mailing-service']],
  search: ['npm', ['run', 'dev', '-w', '@mtpk/search-service']],
  web: ['npm', ['run', 'dev', '-w', '@mtpk/web']],
  // клиентские модули и старые скрипты сайта (src/client, src/legacy), пересборка при изменениях
  'web-client': ['npm', ['run', 'dev:client', '-w', '@mtpk/web']],
  admin: ['npm', ['run', 'dev', '-w', '@mtpk/admin']],
};
const COLORS = [36, 33, 35, 32, 34, 31, 96, 93];

const only = process.argv.slice(2);
const names = only.length ? only : Object.keys(PROCS);
const children: ChildProcess[] = [];
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', FORCE_COLOR: '1' };

names.forEach((name, i) => {
  const def = PROCS[name];
  if (!def) {
    console.error(`неизвестный процесс: ${name}`);
    process.exit(1);
  }
  const color = COLORS[i % COLORS.length];
  const prefix = `\x1b[${color}m${name.padEnd(12)}\x1b[0m│ `;
  const child = spawn(def[0], def[1], { env, shell: process.platform === 'win32' });
  const pipe = (stream: Readable, out: Writable) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${prefix}процесс завершился (код ${code})`));
  children.push(child);
});

function stop() {
  for (const c of children) {
    if (c.exitCode !== null) continue;
    try {
      // на Windows npm порождает дерево процессов — гасим целиком
      if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' });
      else c.kill('SIGTERM');
    } catch {
      /* уже завершён */
    }
  }
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
