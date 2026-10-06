import path from 'node:path';
import type { NextConfig } from 'next';

// Локально переменные лежат в platform/.env (общий файл монорепо).
try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  /* в контейнере .env нет — переменные приходят из окружения */
}

const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';
const MEDIA = process.env.MEDIA_URL ?? 'http://127.0.0.1:4104';
const LEADS = process.env.LEADS_URL ?? 'http://127.0.0.1:4102';
const SEARCH = process.env.SEARCH_URL ?? 'http://127.0.0.1:4103';

const cache = (value: string) => [{ key: 'Cache-Control', value }];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@mtpk/content-kit', '@mtpk/content-model', '@mtpk/shared', '@mtpk/ui'],
  poweredByHeader: false,
  // индикатор Next.js Dev Tools в углу экрана — мешает попиксельной сверке со старым сайтом
  devIndicators: false,
  reactStrictMode: true,
  // Адреса сайта — со слешем на конце (как в Astro). Редирект /foo → /foo/
  // делает src/proxy.ts кодом 301, как nginx (у Next по умолчанию 308).
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // Картинки отдаёт медиасервис из S3; оптимизатор Next не нужен и не пишет кеш на диск.
  images: { unoptimized: true },
  experimental: {
    // Диск C у разработчика один: файловый кеш Turbopack (по умолчанию включён
    // и разрастается до гигабайт) отключаем и в dev, и в сборке.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
    // Заявка с вложением до 10 МБ проходит через прокси Next в dev
    proxyClientMaxBodySize: '20mb',
  },
  async rewrites() {
    return {
      // До файловой маршрутизации: иначе catch-all страница перехватит эти адреса.
      beforeFiles: [
        { source: '/img/:path*', destination: `${MEDIA}/img/:path*` },
        { source: '/files/:path*', destination: `${MEDIA}/files/:path*` },
        { source: '/docs/:path*', destination: `${MEDIA}/docs/:path*` },
        { source: '/og/:path*', destination: `${MEDIA}/og/:path*` },
        // ассеты Практикума — из медиасервиса, сами статьи (HTML-документы) — API-маршрут
        { source: '/praktikum/:path(.+\\.(?:css|js|webp|png|jpe?g|svg|gif|avif|woff2?|pdf))', destination: `${MEDIA}/praktikum/:path` },
        { source: '/praktikum', destination: '/api/praktikum' },
        { source: '/praktikum/:path*', destination: '/api/praktikum/:path*' },
        { source: '/sitemap-index.xml', destination: '/api/sitemap?part=index' },
        { source: '/sitemap-0.xml', destination: '/api/sitemap' },
        { source: '/css/inline-extracted/:file', destination: `${CONTENT}/v1/styles/:file` },
        { source: '/data/:file(stock\\.json|compare-index\\.json|compare-sections\\.json)', destination: `${CONTENT}/v1/data/:file` },
        { source: '/api/send.php', destination: `${LEADS}/api/send.php` },
        { source: '/api/leads', destination: `${LEADS}/api/leads` },
        { source: '/api/search', destination: `${SEARCH}/api/search` },
      ],
    };
  },
  async headers() {
    // Кеш статики — как в nginx старого сайта: css/js 7 дней (сброс через ?v=),
    // шрифты и логотипы 30 дней.
    return [
      { source: '/css/:path*', headers: cache('public, max-age=604800') },
      // клиентские модули: имя файла содержит хеш содержимого — кеш навсегда
      { source: '/assets/:path*', headers: cache('public, max-age=31536000, immutable') },
      { source: '/js/:path*', headers: cache('public, max-age=604800') },
      // шрифты разрешены и другим источникам: их подгружает предпросмотр в админке
      { source: '/fonts/:path*', headers: [...cache('public, max-age=2592000'), { key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/brand/:path*', headers: cache('public, max-age=2592000') },
    ];
  },
};

export default nextConfig;
