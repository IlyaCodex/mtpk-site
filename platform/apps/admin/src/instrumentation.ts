/**
 * Запуск админки: главный администратор — из platform/.env (ADMIN_EMAIL, ADMIN_PASSWORD; lib/main-admin.ts).
 * Нет базы — админка всё равно запускается, в журнале — причина.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { syncMainAdmin } = await import('./lib/main-admin');
  try {
    const result = await syncMainAdmin();
    const text = {
      created: 'создан по .env',
      updated: 'приведён к .env (роль, доступ, пароль)',
      ok: 'совпадает с .env',
      off: 'не задан в .env (ADMIN_EMAIL, ADMIN_PASSWORD)',
    }[result];
    console.log(`[админка] главный администратор: ${text}`);
  } catch (err) {
    console.error(`[админка] главный администратор не проверен: ${(err as Error).message}`);
  }
}
