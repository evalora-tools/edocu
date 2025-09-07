import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar estructura de la tabla contenidos
    const { data, error } = await supabase
      .from('contenidos')
      .select('*')
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        error: 'Error accessing contenidos table', 
        details: error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Table accessible',
      sample_record: data?.[0] || null,
      columns: data?.[0] ? Object.keys(data[0]) : []
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}
