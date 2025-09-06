import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { action, sessionId, watchTime } = await request.json()
    
    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (action === 'update_watch_time' && sessionId && watchTime !== undefined) {
      // Buscar la sesión por session_id en lugar de ID
      const { data: videoSession, error: sessionQueryError } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', session.user.id)
        .single()

      if (sessionQueryError || !videoSession) {
        return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
      }

      // Actualizar el tiempo de visualización
      const { error: updateError } = await supabase
        .from('video_sessions')
        .update({ 
          tiempo_visualizado: Math.round(watchTime),
          porcentaje_completado: videoSession.duracion_video 
            ? (watchTime / videoSession.duracion_video) * 100 
            : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoSession.id)

      if (updateError) {
        console.error('Error actualizando tiempo:', updateError)
        return NextResponse.json({ error: 'Error actualizando tiempo' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Tiempo actualizado a ${Math.round(watchTime)} segundos` 
      })
    }

    if (action === 'simulate_viewing') {
      // Obtener sesiones activas del usuario
      const { data: activeSessions, error: activeError } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('activa', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (activeError) {
        return NextResponse.json({ error: 'Error obteniendo sesiones' }, { status: 500 })
      }

      if (!activeSessions || activeSessions.length === 0) {
        return NextResponse.json({ error: 'No hay sesiones activas' }, { status: 404 })
      }

      const activeSession = activeSessions[0]
      const simulatedWatchTime = Math.min(activeSession.duracion_video * 0.8, 60) // 80% del video o 60 segundos máximo

      // Actualizar con tiempo simulado
      const { error: updateError } = await supabase
        .from('video_sessions')
        .update({ 
          tiempo_visualizado: Math.round(simulatedWatchTime),
          porcentaje_completado: (simulatedWatchTime / activeSession.duracion_video) * 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id)

      if (updateError) {
        return NextResponse.json({ error: 'Error simulando visualización' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Simulación completada: ${Math.round(simulatedWatchTime)} segundos visualizados`,
        session: activeSession
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Error en test-data:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
