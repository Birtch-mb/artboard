import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  // If the refresh token is gone/expired, treat as logged-out so the user
  // can reach /login without being bounced back to /productions.
  const hasAuthError = req.auth?.error === 'RefreshAccessTokenError';
  const isAuthenticated = isLoggedIn && !hasAuthError;

  const isAuthPage =
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/register');

  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/productions', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
