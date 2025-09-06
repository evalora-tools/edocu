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
    const { archivo_url, ...updates } = body || {};

    if (!archivo_url) {
      return NextResponse.json({ error: 'archivo_url (videoId) is required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from('contenidos')
      .update(updates)
      .eq('archivo_url', archivo_url)
      .select();

    if (error) {
      return NextResponse.json({ error: 'Update failed', details: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
