import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 });
    }

    const body = await req.json();
    const {
      titulo,
      descripcion,
      tipo,
      curso_id,
      archivo_url,
      estado_procesamiento = 'processing',
      fecha = null,
      duracion = null,
      orden = 0,
    } = body || {};

    if (!titulo || !tipo || !curso_id || !archivo_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from('contenidos')
      .insert([
        {
          titulo,
          descripcion,
          tipo,
          curso_id,
          archivo_url,
          estado_procesamiento,
          fecha,
          duracion,
          orden,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Insert failed', details: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, contenido: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
