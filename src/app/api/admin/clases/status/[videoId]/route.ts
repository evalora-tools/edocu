import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const apiKey = process.env.VDO_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const { videoId } = params;
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const url = new URL(`https://dev.vdocipher.com/api/videos/${videoId}`);
    url.searchParams.set('t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Apisecret ${apiKey}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    const responseText = await response.text();
    console.log('Status response:', responseText);

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'VdoCipher error', 
        details: responseText 
      }, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
    }

    const videoData = JSON.parse(responseText);
    
    return NextResponse.json({
      id: videoData.id,
      title: videoData.title,
      status: videoData.status,
      length: videoData.length,
      upload_time: videoData.upload_time,
      posters: videoData.posters,
      description: videoData.description
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('Error checking video status:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
