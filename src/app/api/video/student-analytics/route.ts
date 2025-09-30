import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Crear cliente de Supabase para el servidor
    const supabase = createRouteHandlerClient({ cookies })
    
    // Obtener parámetros de la URL
    const studentId = request.nextUrl.searchParams.get('studentId')
    const courseId = request.nextUrl.searchParams.get('courseId')
    
    // Verificar autenticación usando sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = session.user

    // Verificar que el usuario es profesor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, cursos_asignados, academia_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'profesor') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Si se especifica un curso, verificar que el profesor lo tiene asignado
    if (courseId && !profile.cursos_asignados?.includes(courseId)) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    // Primero obtener todas las sesiones de video para los cursos del profesor
    const { data: videoSessions, error: sessionsError } = await supabase
      .from('video_sessions')
      .select(`
        id,
        user_id,
        contenido_id,
        tiempo_visualizado,
        duracion_video,
        porcentaje_completado,
        tiempo_inicio,
        tiempo_fin,
        created_at,
        updated_at
      `)

    if (sessionsError) {
      console.error('Error obteniendo sesiones de video:', sessionsError)
      return NextResponse.json({ error: 'Error al obtener sesiones de video' }, { status: 500 })
    }

    if (!videoSessions || videoSessions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total_students: 0,
        curso_filter: courseId,
        student_filter: studentId
      })
    }

    // Obtener información de los usuarios (alumnos)
    const userIds = [...new Set(videoSessions.map(s => s.user_id))]
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nombre, email, academia_id, role, cursos_adquiridos')
      .in('id', userIds)
      .eq('academia_id', profile.academia_id)
      .in('role', ['alumno', 'estudiante'])

    if (profilesError) {
      console.error('Error obteniendo perfiles:', profilesError)
      return NextResponse.json({ error: 'Error al obtener perfiles' }, { status: 500 })
    }

    // Obtener información de los contenidos
    const contenidoIds = [...new Set(videoSessions.map(s => s.contenido_id))]
    
    const { data: contenidos, error: contenidosError } = await supabase
      .from('contenidos')
      .select('id, titulo, curso_id')
      .in('id', contenidoIds)

    if (contenidosError) {
      console.error('Error obteniendo contenidos:', contenidosError)
      return NextResponse.json({ error: 'Error al obtener contenidos' }, { status: 500 })
    }

    // Obtener información de los cursos
    const cursoIds = [...new Set(contenidos?.map(c => c.curso_id) || [])]
    const { data: cursos, error: cursosError } = await supabase
      .from('cursos')
      .select('id, nombre')
      .in('id', cursoIds)

    if (cursosError) {
      console.error('Error obteniendo cursos:', cursosError)
      return NextResponse.json({ error: 'Error al obtener cursos' }, { status: 500 })
    }

    // Crear mapas para facilitar el acceso
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
    const contenidosMap = new Map(contenidos?.map(c => [c.id, c]) || [])
    const cursosMap = new Map(cursos?.map(c => [c.id, c]) || [])

    // Filtrar sesiones según los criterios
    const filteredSessions = videoSessions.filter(session => {
      const userProfile = profilesMap.get(session.user_id)
      const contenido = contenidosMap.get(session.contenido_id)
      
      if (!userProfile || !contenido) return false
      
      // Verificar que el alumno esté en la misma academia
      if (userProfile.academia_id !== profile.academia_id) return false
      
      // Verificar que el contenido pertenezca a un curso asignado al profesor
      if (!profile.cursos_asignados?.includes(contenido.curso_id)) return false
      
      // Aplicar filtros adicionales
      if (studentId && session.user_id !== studentId) return false
      if (courseId && contenido.curso_id !== courseId) return false
      
      return true
    })

    // Obtener eventos de video para las sesiones filtradas
    const sessionIds = filteredSessions.map(s => s.id)
    const { data: videoEvents, error: eventsError } = await supabase
      .from('video_events')
      .select('id, session_id, timestamp_real')
      .in('session_id', sessionIds)

    if (eventsError) {
      console.error('Error obteniendo eventos:', eventsError)
      // No retornamos error aquí, solo continuamos sin eventos
    }

    // Crear mapa de eventos por sesión
    const eventsMap = new Map<string, any[]>()
    videoEvents?.forEach(event => {
      if (!eventsMap.has(event.session_id)) {
        eventsMap.set(event.session_id, [])
      }
      eventsMap.get(event.session_id)?.push(event)
    })

    // Agrupar datos por alumno y contenido
    const analytics: Record<string, {
      alumno: {
        id: string
        nombre: string
        email: string
      }
      contenidos: Record<string, {
        id: string
        titulo: string
        curso_id: string
        curso_nombre: string
        tiempo_total_visualizado: number
        duracion_video: number
        porcentaje_promedio: number
        sesiones_count: number
        primera_sesion: string
        ultima_sesion: string
        eventos_totales: number
        sesiones: Array<{
          tiempo_visualizado: number
          porcentaje_completado: number
          tiempo_inicio: string
          tiempo_fin: string | null
          eventos: number
          ultimo_evento: string | null
        }>
      }>
      resumen: {
        tiempo_total_curso: number
        contenidos_vistos: number
        contenidos_completados: number
        porcentaje_progreso_curso: number
      }
    }> = {}

    // Procesar los datos
    filteredSessions.forEach((session: any) => {
      const studentKey = session.user_id
      const contentKey = session.contenido_id
      
      const userProfile = profilesMap.get(session.user_id)
      const contenido = contenidosMap.get(session.contenido_id)
      const curso = cursosMap.get(contenido?.curso_id)
      const sessionEvents = eventsMap.get(session.id) || []

      if (!userProfile || !contenido || !curso) return

      // Inicializar estructura del alumno si no existe
      if (!analytics[studentKey]) {
        analytics[studentKey] = {
          alumno: {
            id: session.user_id,
            nombre: userProfile.nombre || 'Sin nombre',
            email: userProfile.email || 'Sin email'
          },
          contenidos: {},
          resumen: {
            tiempo_total_curso: 0,
            contenidos_vistos: 0,
            contenidos_completados: 0,
            porcentaje_progreso_curso: 0
          }
        }
      }

      // Inicializar estructura del contenido si no existe
      if (!analytics[studentKey].contenidos[contentKey]) {
        analytics[studentKey].contenidos[contentKey] = {
          id: session.contenido_id,
          titulo: contenido.titulo || 'Sin título',
          curso_id: contenido.curso_id || '',
          curso_nombre: curso.nombre || 'Sin nombre',
          tiempo_total_visualizado: 0,
          duracion_video: session.duracion_video || 0,
          porcentaje_promedio: 0,
          sesiones_count: 0,
          primera_sesion: session.created_at,
          ultima_sesion: session.updated_at,
          eventos_totales: 0,
          sesiones: []
        }
      }

      // Agregar sesión al contenido
      const contenidoAnalytics = analytics[studentKey].contenidos[contentKey]
      contenidoAnalytics.tiempo_total_visualizado += session.tiempo_visualizado || 0
      contenidoAnalytics.sesiones_count += 1
      contenidoAnalytics.eventos_totales += sessionEvents.length
      
      // Actualizar fechas si es necesario
      if (session.created_at < contenidoAnalytics.primera_sesion) {
        contenidoAnalytics.primera_sesion = session.created_at
      }
      if (session.updated_at > contenidoAnalytics.ultima_sesion) {
        contenidoAnalytics.ultima_sesion = session.updated_at
      }

      // Agregar información de la sesión específica
      contenidoAnalytics.sesiones.push({
        tiempo_visualizado: session.tiempo_visualizado || 0,
        porcentaje_completado: parseFloat(session.porcentaje_completado) || 0,
        tiempo_inicio: session.tiempo_inicio,
        tiempo_fin: session.tiempo_fin,
        eventos: sessionEvents.length,
        ultimo_evento: sessionEvents.length > 0 
          ? sessionEvents[sessionEvents.length - 1]?.timestamp_real 
          : null
      })

      // Calcular porcentaje promedio del contenido
      if (contenidoAnalytics.duracion_video > 0) {
        contenidoAnalytics.porcentaje_promedio = Math.min(100, (contenidoAnalytics.tiempo_total_visualizado / contenidoAnalytics.duracion_video) * 100)
      }
    })

    // Calcular resúmenes por alumno
    Object.keys(analytics).forEach(studentKey => {
      const student = analytics[studentKey]
      const contenidos = Object.values(student.contenidos)
      
      student.resumen.contenidos_vistos = contenidos.length
      student.resumen.contenidos_completados = contenidos.filter(c => c.porcentaje_promedio >= 80).length
      student.resumen.tiempo_total_curso = contenidos.reduce((total, c) => total + c.tiempo_total_visualizado, 0)
      
      if (contenidos.length > 0) {
        student.resumen.porcentaje_progreso_curso = contenidos.reduce((total, c) => total + c.porcentaje_promedio, 0) / contenidos.length
      }
    })

    return NextResponse.json({
      success: true,
      data: Object.values(analytics),
      total_students: Object.keys(analytics).length,
      curso_filter: courseId,
      student_filter: studentId,
      debug: {
        total_sessions: videoSessions?.length || 0,
        filtered_sessions: filteredSessions.length,
        profiles_found: profiles?.length || 0,
        contenidos_found: contenidos?.length || 0,
        cursos_found: cursos?.length || 0
      }
    })

  } catch (error) {
    console.error('Error en student-analytics:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
