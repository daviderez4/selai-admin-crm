import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - partner (partner portal)
     * - share (public share pages)
     * - guest (guest access pages)
     * - api/guest (guest API endpoints)
     */
    '/((?!_next/static|_next/image|favicon.ico|partner|share|guest|api/guest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
