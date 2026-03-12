/**
 * Server-side PDF proxy.
 *
 * PDF.js fetches its source URL directly from the browser, which means R2
 * presigned URLs fail with a CORS error (R2 doesn't set CORS headers by
 * default). This route runs on the Next.js server, fetches the PDF from R2
 * server-side (no CORS), and streams the bytes back to the browser under
 * our own origin — so PDF.js gets the file without any CORS issues.
 *
 * Flow:
 *   1. Verify the session (auth cookie) — 401 if missing / expired.
 *   2. Call the NestJS API to get a fresh presigned URL for the script.
 *   3. Fetch the PDF bytes from R2 on the server.
 *   4. Stream them back with Content-Type: application/pdf.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

export async function GET(
  req: NextRequest,
  { params }: { params: { productionId: string; scriptId: string } },
) {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productionId, scriptId } = params;

  // 1. Get a fresh presigned URL from the NestJS API
  let signedUrl: string;
  try {
    const urlRes = await fetch(
      `${API_URL}/productions/${productionId}/scripts/${scriptId}/url`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } },
    );
    if (!urlRes.ok) {
      return NextResponse.json({ error: 'Script not found' }, { status: urlRes.status });
    }
    const data = await urlRes.json();
    signedUrl = data.url;
  } catch {
    return NextResponse.json({ error: 'Failed to get script URL' }, { status: 502 });
  }

  // 2. Fetch the PDF bytes from R2 (server-side — no CORS restriction)
  let pdfResponse: Response;
  try {
    pdfResponse = await fetch(signedUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to reach storage' }, { status: 502 });
  }

  // 3. Stream the bytes back
  const body = await pdfResponse.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': body.byteLength.toString(),
      // Allow browsers to cache the PDF for a short period (5 minutes)
      'Cache-Control': 'private, max-age=300',
    },
  });
}
