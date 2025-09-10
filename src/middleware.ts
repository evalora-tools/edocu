import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login', '/api/auth', '/_next', '/static', '/favicon.ico', '/']

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  const { pathname } = request.nextUrl

  // Verificar si es una ruta pública
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return res
  }

  try {
    // Verificar sesión
    const { data: { session } } = await supabase.auth.getSession()

    // Si no hay sesión, redirigir a login
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error al obtener el perfil:', profileError)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar acceso basado en rol y redirigir apropiadamente
    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
      // Redirigir a la página apropiada para el rol del usuario
      if (profile.role === 'gestor') {
        return NextResponse.redirect(new URL('/gestor', request.url))
      } else if (profile.role === 'profesor') {
        return NextResponse.redirect(new URL('/profesor', request.url))
      } else if (profile.role === 'alumno') {
        return NextResponse.redirect(new URL('/alumno', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (pathname.startsWith('/gestor') && profile.role !== 'gestor') {
      if (profile.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (profile.role === 'profesor') {
        return NextResponse.redirect(new URL('/profesor', request.url))
      } else if (profile.role === 'alumno') {
        return NextResponse.redirect(new URL('/alumno', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (pathname.startsWith('/profesor') && profile.role !== 'profesor') {
      if (profile.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (profile.role === 'gestor') {
        return NextResponse.redirect(new URL('/gestor', request.url))
      } else if (profile.role === 'alumno') {
        return NextResponse.redirect(new URL('/alumno', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (pathname.startsWith('/alumno') && profile.role !== 'alumno') {
      if (profile.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (profile.role === 'gestor') {
        return NextResponse.redirect(new URL('/gestor', request.url))
      } else if (profile.role === 'profesor') {
        return NextResponse.redirect(new URL('/profesor', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return res

  } catch (error) {
    console.error('Error en middleware:', error)
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