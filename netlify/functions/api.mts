const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyiIgDu0EgSPJZSs1pmZvkhykJyDDXdPm8QZRURLaPdw0FhpS0QA14LowqoKPNQY4DN/exec';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ success: false, message: 'Method not allowed.' }, { status: 405 });
  }

  try {
    const body = await req.text();
    if (!body || body.length > 2_000_000) {
      return Response.json({ success: false, message: 'Хүсэлтийн мэдээлэл буруу байна.' }, { status: 400 });
    }

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      signal: AbortSignal.timeout(25_000)
    });

    const text = await upstream.text();

    try {
      JSON.parse(text);
    } catch {
      console.error('Apps Script returned non-JSON', {
        status: upstream.status,
        contentType: upstream.headers.get('content-type'),
        preview: text.slice(0, 160)
      });
      return Response.json(
        { success: false, message: 'Сервер түр буруу хариу өглөө. Дахин оролдоно уу.' },
        { status: 502 }
      );
    }

    return new Response(text, {
      status: upstream.ok ? 200 : 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error('Apps Script proxy failed', error);
    return Response.json(
      { success: false, message: timedOut ? 'Серверийн хариу удаж байна. Дахин оролдоно уу.' : 'Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.' },
      { status: timedOut ? 504 : 502 }
    );
  }
};

export const config = {
  path: '/api'
};
