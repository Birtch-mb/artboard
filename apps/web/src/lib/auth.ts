import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// How many ms before expiry to proactively refresh (1 minute buffer)
const REFRESH_BUFFER_MS = 60 * 1000;
// Access token TTL from the API (15 minutes)
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  // No refresh token stored (e.g. old session pre-dating this feature) — force re-login
  if (!token.refreshToken) {
    return { ...token, error: 'RefreshAccessTokenError' };
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    if (!res.ok) throw new Error('Refresh failed');

    const data = (await res.json()) as { accessToken: string };

    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = (await res.json()) as {
            accessToken: string;
            refreshToken: string;
            user: { id: string; email: string; name: string };
          };

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in — store tokens and expiry
      if (user) {
        const u = user as {
          id: string;
          accessToken: string;
          refreshToken: string;
        };
        return {
          ...token,
          id: u.id,
          accessToken: u.accessToken,
          refreshToken: u.refreshToken,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
        };
      }

      // Token still valid — return as-is
      const expires = token.accessTokenExpires as number | undefined;
      if (expires && Date.now() < expires - REFRESH_BUFFER_MS) {
        return token;
      }

      // Token expired (or about to) — refresh it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
});
