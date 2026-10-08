import { NextResponse, type NextRequest } from 'next/server';
import { BASE_PATH } from '@/lib/base-path';
import { GATE_COOKIE, GATE_TTL, gatePass, hasGate, loginToken, sameSecret, secureCookies } from '@/lib/gate';

const SESSION_COOKIE = 'mtpk_admin';
const BAR_COOKIE = 'mtpk_bar';

/** Ответ «такой страницы нет» — без вёрстки админки: снаружи её не видно. */
const notFound = () =>
  new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' } });

/** Адрес, по которому пришёл посетитель: за шлюзом и прокси сайта — из X-Forwarded-*. */
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || req.nextUrl.protocol.replace(':', '');
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

/**
 * Секретная ссылка входа (см. lib/gate.ts):
 *  - /admin/login?token=… — верный токен: пропуск в cookie и переход на чистый
 *    /admin/login (токен не остаётся в адресной строке); неверный — 404;
 *  - страница входа и вход по API — только с пропуском, иначе 404;
 *  - остальные страницы без пропуска и без сессии — 404 (API ответит 401 сам).
 */
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const token = loginToken();
  const isLogin = pathname === '/login';

  if (isLogin && searchParams.has('token')) {
    if (!token || !(await sameSecret(searchParams.get('token') ?? '', token))) return notFound();
    const res = NextResponse.redirect(`${publicOrigin(req)}${BASE_PATH}/login`, 303);
    res.cookies.set(GATE_COOKIE, await gatePass(token), { httpOnly: true, sameSite: 'lax', secure: secureCookies(), path: BASE_PATH, maxAge: GATE_TTL });
    res.headers.set('cache-control', 'no-store');
    return res;
  }

  const gate = await hasGate(req.cookies.get(GATE_COOKIE)?.value);
  if (isLogin || pathname === '/api/v1/auth/login') return gate ? NextResponse.next() : notFound();
  if (!gate && !req.cookies.has(SESSION_COOKIE) && !pathname.startsWith('/api/')) return notFound();
  const res = NextResponse.next();
  // вошли раньше, чем появился флажок панели на сайте, — поставить (см. BAR_COOKIE в lib/auth.ts)
  if (req.cookies.has(SESSION_COOKIE) && !req.cookies.has(BAR_COOKIE)) {
    res.cookies.set(BAR_COOKIE, '1', { path: '/', sameSite: 'lax', secure: secureCookies(), maxAge: 7 * 24 * 3600 });
  }
  return res;
}

export const config = {
  // главная админки и все адреса, кроме статики Next и значка
  matcher: ['/', '/((?!_next/|favicon\\.svg).*)'],
};
