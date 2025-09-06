import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Intentar añadir la columna estado_procesamiento
    const { data, error } = await supabase.rpc('add_estado_procesamiento_column');
    
    if (error) {
      return NextResponse.json({ 
        error: 'Error adding column', 
        details: error,
        message: 'You may need to add this column manually in Supabase dashboard'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Column added successfully',
      data
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      message: 'You may need to add the estado_procesamiento column manually'
    }, { status: 500 });
  }
}
