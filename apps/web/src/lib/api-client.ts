const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public error: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      statusCode: res.status,
      message: res.statusText,
      error: 'Request failed',
    }));
    throw new ApiError(err.statusCode, err.message, err.error);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function createApiClient(token: string) {
  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET', token }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: 'POST',
        token,
        body: body ? JSON.stringify(body) : undefined,
      }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: 'PATCH',
        token,
        body: body ? JSON.stringify(body) : undefined,
      }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE', token }),
  };
}

export function createPublicApiClient() {
  return {
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
  };
}
