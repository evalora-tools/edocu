import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const cursoId = request.nextUrl.searchParams.get('curso_id')
    const contenidoId = request.nextUrl.searchParams.get('contenido_id')

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario sea profesor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, cursos_asignados')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'profesor') {
      return NextResponse.json({ error: 'Solo profesores pueden acceder' }, { status: 403 })
    }

    // Construir query base
    let query = supabase
      .from('video_sessions')
      .select(`
        *,
        profiles!inner(nombre, email),
        contenidos!inner(titulo, curso_id)
      `)

    // Filtrar por cursos asignados al profesor
    if (profile.cursos_asignados && profile.cursos_asignados.length > 0) {
      query = query.in('contenidos.curso_id', profile.cursos_asignados)
    } else {
      // Si no tiene cursos asignados, no mostrar nada
      return NextResponse.json({ sessions: [] })
    }

    // Aplicar filtros adicionales
    if (cursoId) {
      query = query.eq('contenidos.curso_id', cursoId)
    }

    if (contenidoId) {
      query = query.eq('contenido_id', contenidoId)
    }

    const { data: sessions, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error obteniendo sesiones:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Calcular estadísticas
    const stats = {
      totalSessions: sessions?.length || 0,
      activeSessions: sessions?.filter(s => s.activa).length || 0,
      totalWatchTime: sessions?.reduce((sum, s) => sum + (s.tiempo_visualizado || 0), 0) || 0,
      averageCompletion: sessions?.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.porcentaje_completado || 0), 0) / sessions.length
        : 0,
      uniqueUsers: new Set(sessions?.map(s => s.user_id)).size,
      suspiciousSessions: sessions?.filter(s => 
        s.metadata && s.metadata.suspicious
      ).length || 0
    }

    return NextResponse.json({ 
      sessions: sessions || [],
      stats
    })

  } catch (error) {
    console.error('Error en video-analytics:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
