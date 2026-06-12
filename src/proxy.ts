import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Better Auth stores the session token in these cookies depending on environment
  const hasSession = 
    request.cookies.has("better-auth.session_token") || 
    request.cookies.has("__Secure-better-auth.session_token");

  const { pathname, searchParams } = request.nextUrl;

  // Define route categories
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isApiRoute = pathname.startsWith('/api');

  // If user is NOT logged in and trying to access a protected page
  if (!hasSession && !isAuthRoute && !isApiRoute) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL so the user can be redirected back (useful for /invite links)
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', request.url);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If user IS logged in and tries to access login/register
  if (hasSession && isAuthRoute) {
    const callbackUrl = searchParams.get('callbackUrl');
    return NextResponse.redirect(new URL(callbackUrl || '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
