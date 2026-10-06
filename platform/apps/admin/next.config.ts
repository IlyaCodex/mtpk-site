import path from 'node:path';
import type { NextConfig } from 'next';

// Локально переменные лежат в platform/.env (общий файл монорепо).
try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  /* в контейнере .env нет — переменные приходят из окружения */
}

const MEDIA = process.env.MEDIA_URL ?? 'http://127.0.0.1:4104';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@mtpk/content-model', '@mtpk/db', '@mtpk/shared'],
  // драйверы с нативными/динамическими зависимостями — не бандлить
  serverExternalPackages: ['pg', 'ioredis'],
  poweredByHeader: false,
  devIndicators: false,
  reactStrictMode: true,
  experimental: {
    // Диск C у разработчика один: файловый кеш Turbopack не ведём
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
    // загрузка файлов в медиатеку идёт через /api/v1/media
    proxyClientMaxBodySize: '50mb',
  },
  async rewrites() {
    // превью файлов медиатеки — прямо из медиасервиса
    return [{ source: '/media-files/:path*', destination: `${MEDIA}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
