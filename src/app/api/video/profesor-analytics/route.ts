import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profesorId = searchParams.get('profesorId');
    const cursoId = searchParams.get('cursoId');

    if (!profesorId) {
      return NextResponse.json(
        { error: 'profesorId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea profesor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, cursos_asignados, academia_id')
      .eq('id', profesorId)
      .single();

    if (profileError || !profile || profile.role !== 'profesor') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Primero obtener sesiones de visualización con contenidos
    const { data: watchSessions, error: sessionsError } = await supabase
      .from('video_watch_time')
      .select(`
        id,
        user_id,
        contenido_id,
        session_start,
        session_end,
        watch_time_seconds,
        is_active,
        contenidos:contenido_id!inner (
          id,
          titulo,
          tipo,
          curso_id,
          cursos:curso_id!inner (
            id,
            nombre,
            profesor_id
          )
        )
      `)
      .order('session_start', { ascending: false });

    if (sessionsError) {
      console.error('Error consultando sesiones:', sessionsError);
      return NextResponse.json(
        { error: 'Error consultando sesiones de visualización' },
        { status: 500 }
      );
    }

    // Filtrar solo las sesiones de cursos del profesor
    const filteredSessions = watchSessions?.filter(session => {
      const contenidos = Array.isArray(session.contenidos) ? session.contenidos[0] : session.contenidos;
      const cursos = Array.isArray(contenidos?.cursos) ? contenidos.cursos[0] : contenidos?.cursos;
      const cursoProfesorId = cursos?.profesor_id;
      const cursoBelongsToProfesor = profile.cursos_asignados?.includes(contenidos?.curso_id);
      
      return cursoProfesorId === profesorId || cursoBelongsToProfesor;
    }) || [];

    // Si se especifica un curso, filtrar por ese curso
    const finalSessions = cursoId 
      ? filteredSessions.filter(session => {
          const contenidos = Array.isArray(session.contenidos) ? session.contenidos[0] : session.contenidos;
          return contenidos?.curso_id === cursoId;
        })
      : filteredSessions;

    // Obtener información de usuarios únicos
    const uniqueUserIds = [...new Set(finalSessions.map(session => session.user_id))];
    
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, nombre, email')
      .in('id', uniqueUserIds);

    if (usersError) {
      console.error('Error consultando usuarios:', usersError);
    }

    // Crear un mapa de usuarios para búsqueda rápida
    const usersMap = (usersData || []).reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, any>);

    // Calcular estadísticas generales
    const totalSessions = finalSessions.length;
    const completedSessions = finalSessions.filter(s => s.session_end && !s.is_active);
    const activeSessions = finalSessions.filter(s => s.is_active);
    const totalWatchTime = finalSessions.reduce((total, session) => 
      total + (session.watch_time_seconds || 0), 0
    );

    // Estadísticas por alumno
    const studentStats = finalSessions.reduce((acc, session) => {
      const userId = session.user_id;
      const user = usersMap[userId];
      const userName = user?.nombre || 'Usuario desconocido';
      const userEmail = user?.email || '';

      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName,
          userEmail,
          totalSessions: 0,
          totalWatchTime: 0,
          completedSessions: 0,
          activeSessions: 0,
          lastActivity: null,
          clasesVisualizadas: new Set()
        };
      }

      acc[userId].totalSessions++;
      acc[userId].totalWatchTime += session.watch_time_seconds || 0;
      
      if (session.session_end && !session.is_active) {
        acc[userId].completedSessions++;
      }
      
      if (session.is_active) {
        acc[userId].activeSessions++;
      }

      const contenidos = Array.isArray(session.contenidos) ? session.contenidos[0] : session.contenidos;
      if (contenidos?.titulo) {
        acc[userId].clasesVisualizadas.add(contenidos.titulo);
      }

      // Actualizar última actividad
      const sessionDate = new Date(session.session_start);
      if (!acc[userId].lastActivity || sessionDate > new Date(acc[userId].lastActivity)) {
        acc[userId].lastActivity = session.session_start;
      }

      return acc;
    }, {} as Record<string, any>);

    // Convertir Set a array para la respuesta
    const studentStatsArray = Object.values(studentStats).map((student: any) => ({
      ...student,
      clasesVisualizadas: Array.from(student.clasesVisualizadas),
      uniqueClassesCount: student.clasesVisualizadas.size
    }));

    // Estadísticas por clase
    const classStats = finalSessions.reduce((acc, session) => {
      const contentId = session.contenido_id;
      const contenidos = Array.isArray(session.contenidos) ? session.contenidos[0] : session.contenidos;
      const contentTitle = contenidos?.titulo || 'Clase desconocida';

      if (!acc[contentId]) {
        acc[contentId] = {
          contentId,
          contentTitle,
          totalViews: 0,
          totalWatchTime: 0,
          uniqueStudents: new Set(),
          averageWatchTime: 0
        };
      }

      acc[contentId].totalViews++;
      acc[contentId].totalWatchTime += session.watch_time_seconds || 0;
      acc[contentId].uniqueStudents.add(session.user_id);

      return acc;
    }, {} as Record<string, any>);

    const classStatsArray = Object.values(classStats).map((classItem: any) => ({
      ...classItem,
      uniqueStudents: classItem.uniqueStudents.size,
      averageWatchTime: classItem.totalViews > 0 
        ? Math.round(classItem.totalWatchTime / classItem.totalViews) 
        : 0
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalSessions,
        completedSessions: completedSessions.length,
        activeSessions: activeSessions.length,
        totalWatchTimeSeconds: totalWatchTime,
        totalWatchTimeMinutes: Math.round(totalWatchTime / 60),
        totalWatchTimeHours: Math.round(totalWatchTime / 3600 * 100) / 100,
        uniqueStudents: Object.keys(studentStats).length
      },
      studentStats: studentStatsArray,
      classStats: classStatsArray,
      recentSessions: finalSessions.slice(0, 20) // Últimas 20 sesiones
    });

  } catch (error) {
    console.error('Error en profesor analytics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}