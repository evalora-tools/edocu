import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, watchTimeSeconds } = await request.json();

    if (!sessionId || watchTimeSeconds === undefined) {
      return NextResponse.json(
        { error: 'sessionId y watchTimeSeconds son requeridos' },
        { status: 400 }
      );
    }

    // Validar que watchTimeSeconds sea un número positivo
    if (typeof watchTimeSeconds !== 'number' || watchTimeSeconds < 0) {
      return NextResponse.json(
        { error: 'watchTimeSeconds debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Actualizar la sesión con el tiempo final
    const { data: updatedSession, error: updateError } = await supabase
      .from('video_watch_time')
      .update({
        session_end: new Date().toISOString(),
        watch_time_seconds: watchTimeSeconds,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('is_active', true)
      .select('id, user_id, contenido_id, watch_time_seconds')
      .single();

    if (updateError) {
      console.error('Error actualizando sesión:', updateError);
      return NextResponse.json(
        { error: 'Error finalizando sesión de visualización' },
        { status: 500 }
      );
    }

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o ya finalizada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: updatedSession.id,
      watchTimeSeconds: updatedSession.watch_time_seconds,
      message: 'Sesión finalizada correctamente'
    });

  } catch (error) {
    console.error('Error en end-session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}