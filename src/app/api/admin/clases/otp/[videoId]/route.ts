import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
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

    const url = `https://dev.vdocipher.com/api/videos/${videoId}/otp`;
    const vdoRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Apisecret ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: 300 }),
      cache: 'no-store',
    });

    const text = await vdoRes.text();
    if (!vdoRes.ok) {
      return NextResponse.json({ error: 'VdoCipher error', details: text }, { status: vdoRes.status });
    }

    const data = JSON.parse(text);
    return NextResponse.json({ otp: data.otp, playbackInfo: data.playbackInfo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
