import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { session_id, tiempo_visualizado } = await request.json()

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

    // Actualizar tiempo de visualización
    const { error: updateError } = await supabase
      .from('video_sessions')
      .update({ 
        tiempo_visualizado,
        porcentaje_completado: videoSession.duracion_video 
          ? (tiempo_visualizado / videoSession.duracion_video) * 100 
          : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoSession.id)

    if (updateError) {
      console.error('Error actualizando tiempo:', updateError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en update-time:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
