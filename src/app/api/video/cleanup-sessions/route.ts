import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Limpiar sesiones del usuario actual
    const { error: updateError } = await supabase
      .from('video_sessions')
      .update({ 
        activa: false,
        tiempo_fin: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .eq('activa', true)

    if (updateError) {
      console.error('Error limpiando sesiones:', updateError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Sesiones limpiadas correctamente'
    })

  } catch (error) {
    console.error('Error en cleanup-sessions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
