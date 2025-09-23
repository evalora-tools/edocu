import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/login', 
  '/api/auth', 
  '/api/video', // Permitir acceso a APIs de video (pero pueden requerir auth internamente)
  '/_next', 
  '/static', 
  '/favicon.ico', 
  '/',
  '/asignatura' // Permitir acceso a páginas de asignaturas/contenidos (pero el tracking requerirá auth)
]

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  const { pathname } = request.nextUrl

  // Verificar si es una ruta pública
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return res
  }

  try {
    // Solo verificar sesión - dejar que AuthContext maneje el resto
    const { data: { session }, error } = await supabase.auth.getSession()

    // Si no hay sesión, redirigir a login
    if (error || !session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return res

  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}