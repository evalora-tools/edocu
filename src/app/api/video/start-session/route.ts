import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, contenidoId } = await request.json();

    if (!userId || !contenidoId) {
      return NextResponse.json(
        { error: 'userId y contenidoId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe y tiene acceso al contenido
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, cursos_adquiridos')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el contenido existe
    const { data: contenido, error: contenidoError } = await supabase
      .from('contenidos')
      .select('id, curso_id, tipo')
      .eq('id', contenidoId)
      .single();

    if (contenidoError || !contenido) {
      return NextResponse.json(
        { error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario tiene acceso al curso
    if (!profile.cursos_adquiridos?.includes(contenido.curso_id)) {
      return NextResponse.json(
        { error: 'Sin acceso a este contenido' },
        { status: 403 }
      );
    }

    // Finalizar cualquier sesión activa previa para este usuario y contenido
    await supabase
      .from('video_watch_time')
      .update({
        is_active: false,
        session_end: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('contenido_id', contenidoId)
      .eq('is_active', true);

    // Crear nueva sesión de visualización
    const { data: session, error: sessionError } = await supabase
      .from('video_watch_time')
      .insert({
        user_id: userId,
        contenido_id: contenidoId,
        session_start: new Date().toISOString(),
        is_active: true
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Error creando sesión:', sessionError);
      return NextResponse.json(
        { error: 'Error creando sesión de visualización' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error en start-session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}