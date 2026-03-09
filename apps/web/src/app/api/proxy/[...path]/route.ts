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

  console.log(`[proxy] ${request.method} ${targetUrl} content-type=${contentType ?? 'none'} body-bytes=${body?.byteLength ?? 0} auth=${authorization ? 'present' : 'missing'}`);

  // Phase 1: establish connection. If this throws the backend is genuinely unreachable.
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });
  } catch (error) {
    console.error('[proxy] Backend unreachable:', error);
    return NextResponse.json(
      { statusCode: 502, message: 'Backend unreachable', error: 'Bad Gateway' },
      { status: 502 },
    );
  }

  // Phase 2: read body. For 204 No Content there is nothing to read, and a
  // connection reset at this stage means the backend already completed the
  // operation successfully — so we fall through with an empty body rather than
  // masking the real status code with a 502.
  let responseText = '';
  try {
    responseText = await response.text();
  } catch {
    // Body unreadable (e.g. connection reset after headers). Proceed with the
    // real status code and an empty body — the operation succeeded on the backend.
  }

  console.log(`[proxy] response status=${response.status} body=${responseText.slice(0, 300)}`);

  return new NextResponse(responseText || null, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as PATCH,
  proxyRequest as DELETE,
};
