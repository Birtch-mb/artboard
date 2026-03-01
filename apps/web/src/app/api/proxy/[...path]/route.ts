import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const pathStr = '/' + params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}${pathStr}${searchParams ? `?${searchParams}` : ''}`;

  const headers: HeadersInit = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  const authorization = request.headers.get('authorization');
  if (authorization) headers['authorization'] = authorization;

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  // Use arrayBuffer to preserve binary data (e.g. multipart/form-data file uploads).
  // request.text() would corrupt non-UTF-8 binary content such as PDF bytes.
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const responseText = await response.text();

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[proxy] Backend unreachable:', error);
    return NextResponse.json(
      { statusCode: 502, message: 'Backend unreachable', error: 'Bad Gateway' },
      { status: 502 },
    );
  }
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as PATCH,
  proxyRequest as DELETE,
};
