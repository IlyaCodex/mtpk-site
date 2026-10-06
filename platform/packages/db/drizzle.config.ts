import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './migrations',
  schemaFilter: ['content', 'leads', 'search', 'admin'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://mtpk:mtpk_dev_password@127.0.0.1:5442/mtpk',
  },
});
