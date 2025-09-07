import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, cursos_asignados, academia_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Obtener count de sesiones de video
    const { count: sessionsCount, error: sessionsError } = await supabase
      .from('video_sessions')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email
      },
      profile: profile,
      sessionsCount: sessionsCount,
      error: sessionsError
    })

  } catch (error) {
    console.error('Error en test:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
