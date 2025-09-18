import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { videoId: string } }) {
  const { videoId } = params;
  const apiSecret = process.env.VDOCIPHER_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'API secret not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Apisecret ${apiSecret}`,
      },
      body: JSON.stringify({ ttl: 300 }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('VdoCipher API error:', errorText);
      return NextResponse.json({ error: 'VdoCipher API error', details: errorText }, { status: 500 });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
