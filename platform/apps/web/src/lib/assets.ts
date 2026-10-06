import fs from 'node:fs';
import path from 'node:path';

/** Клиентские модули (см. scripts/build-client.mjs). */
export type ClientModule = 'site' | 'gallery' | 'lightbox' | 'spec-nav' | 'catalog-filter' | 'core.css' | 'core-end.css';

const MANIFEST = path.join(process.cwd(), 'public/assets/manifest.json');
let cached: Record<string, string> | null = null;

/**
 * Адреса собранных модулей с хешем в имени. В разработке манифест
 * перечитывается (сборщик в режиме watch пересобирает файлы).
 */
export function clientModuleUrl(name: ClientModule): string | null {
  if (!cached || process.env.NODE_ENV !== 'production') {
    try {
      cached = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Record<string, string>;
    } catch {
      cached = {};
    }
  }
  return cached[name] ?? null;
}
