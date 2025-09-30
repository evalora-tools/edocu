import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.VDO_API_KEY; // ✅ Sin NEXT_PUBLIC_
    
    if (!apiKey) {
      return NextResponse.json({ error: 'VdoCipher API key not configured' }, { status: 500 });
    }

    const { title, folderId } = body;
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // ✅ Query parameters en lugar de body
    const url = new URL('https://dev.vdocipher.com/api/videos');
    url.searchParams.set('title', title);
    if (folderId) url.searchParams.set('folderId', folderId);

    const vdoRes = await fetch(url.toString(), {
      method: 'PUT', // ✅ PUT en lugar de POST
      headers: {
        'Authorization': `Apisecret ${apiKey}`,
      },
      // ✅ Sin body ni Content-Type
    });

    const vdoText = await vdoRes.text();

    if (!vdoRes.ok) {
      return NextResponse.json({ 
        error: 'VdoCipher error', 
        details: vdoText 
      }, { status: vdoRes.status });
    }

    const vdoData = JSON.parse(vdoText);
    
    // ✅ Estructura según documentación
    return NextResponse.json({
      videoId: vdoData.videoId,
      uploadLink: vdoData.clientPayload.uploadLink,
      clientPayload: vdoData.clientPayload
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}