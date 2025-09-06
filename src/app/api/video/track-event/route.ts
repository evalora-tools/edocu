import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { 
      session_id,
      event_type,
      timestamp_video,
      metadata = {}
    } = await request.json()

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la sesión pertenezca al usuario
    const { data: videoSession } = await supabase
      .from('video_sessions')
      .select('*')
      .eq('session_id', session_id)
      .eq('user_id', session.user.id)
      .single()

    if (!videoSession) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Crear evento
    const { error: eventError } = await supabase
      .from('video_events')
      .insert({
        session_id: videoSession.id,
        event_type,
        timestamp_video,
        metadata
      })

    if (eventError) {
      console.error('Error creando evento:', eventError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Si es evento de cierre o finalización, marcar sesión como inactiva
    if (event_type === 'close' || event_type === 'ended') {
      const { error: updateError } = await supabase
        .from('video_sessions')
        .update({ 
          activa: false,
          tiempo_fin: new Date().toISOString(),
          tiempo_visualizado: timestamp_video,
          porcentaje_completado: videoSession.duracion_video 
            ? (timestamp_video / videoSession.duracion_video) * 100 
            : 0
        })
        .eq('id', videoSession.id)

      if (updateError) {
        console.error('Error actualizando sesión:', updateError)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en track-event:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
