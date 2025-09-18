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

  console.log('🔍 Middleware ejecutándose para:', pathname)

  // Verificar si es una ruta pública
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    console.log('✅ Ruta pública, permitiendo acceso:', pathname)
    return res
  }

  try {
    // Solo verificar sesión - dejar que AuthContext maneje el resto
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.log('❌ Error en middleware getSession:', error.message)
    }

    // Si no hay sesión, redirigir a login
    if (error || !session?.user) {
      console.log('🚫 Middleware: Sin sesión válida, redirigiendo a login desde:', pathname)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    console.log('✅ Middleware: Sesión válida para usuario:', session.user.email, 'accediendo a:', pathname)
    
    // Solo verificar acceso básico a rutas protegidas
    // El AuthContext se encargará de las redirecciones específicas por rol
    const protectedPaths = ['/admin', '/gestor', '/profesor', '/alumno']
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    
    if (isProtectedPath) {
      console.log('🔐 Middleware: Accediendo a ruta protegida:', pathname)
    }

    return res

  } catch (error) {
    console.error('❌ Error en middleware:', error)
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