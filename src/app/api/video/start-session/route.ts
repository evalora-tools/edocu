import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { 
      contenido_id, 
      duracion_video,
      ip_address,
      user_agent 
    } = await request.json()

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario tenga acceso al contenido
    const { data: profile } = await supabase
      .from('profiles')
      .select('cursos_adquiridos, cursos_asignados, role')
      .eq('id', session.user.id)
      .single()

    const { data: contenido } = await supabase
      .from('contenidos')
      .select('curso_id')
      .eq('id', contenido_id)
      .single()

    if (!contenido) {
      return NextResponse.json({ error: 'Contenido no encontrado' }, { status: 404 })
    }

    // Verificar acceso según el rol
    let hasAccess = false
    if (profile?.role === 'profesor' && profile.cursos_asignados?.includes(contenido.curso_id)) {
      hasAccess = true
    } else if (profile?.role === 'alumno' && profile.cursos_adquiridos?.includes(contenido.curso_id)) {
      hasAccess = true
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Sin acceso al contenido' }, { status: 403 })
    }

    // PRIMERO: Limpiar sesiones antiguas automáticamente
    await supabase.rpc('cleanup_old_sessions')

    // SEGUNDO: Cerrar sesiones activas anteriores para este contenido
    await supabase
      .from('video_sessions')
      .update({ 
        activa: false,
        tiempo_fin: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .eq('contenido_id', contenido_id)
      .eq('activa', true)

    // DESPUÉS: Detectar sesiones sospechosas (ahora debería haber 0 sesiones activas)
    const { data: suspiciousCheck } = await supabase
      .rpc('detect_suspicious_sessions', {
        p_user_id: session.user.id,
        p_contenido_id: contenido_id,
        p_current_ip: ip_address,
        p_current_user_agent: user_agent
      })

    // Solo mostrar advertencia, no bloquear completamente
    let warningMessage = null
    if (suspiciousCheck && suspiciousCheck[0]?.is_suspicious) {
      // En lugar de bloquear, solo mostrar advertencia
      if (suspiciousCheck[0].different_ips > 5 || suspiciousCheck[0].different_devices > 3) {
        warningMessage = `Detectamos acceso desde múltiples ubicaciones (${suspiciousCheck[0].different_ips} IPs, ${suspiciousCheck[0].different_devices} dispositivos). Por seguridad, esto será monitoreado.`
      }
    }

    // Crear nueva sesión
    const sessionId = crypto.randomUUID()
    const { data: newSession, error } = await supabase
      .from('video_sessions')
      .insert({
        user_id: session.user.id,
        contenido_id,
        session_id: sessionId,
        duracion_video,
        ip_address,
        user_agent,
        activa: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creando sesión:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ 
      session: newSession,
      warning: warningMessage
    })

  } catch (error) {
    console.error('Error en start-session:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
