import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from 'lib/auth/jwt';

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
};

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function requireAuth(req: NextRequest):
  | { user: AuthUser; error: null }
  | { user: null; error: NextResponse } {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      };
    }

    const user = verifyAuthToken(token);
    return { user, error: null };
  } catch {
    return {
      user: null,
      error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    };
  }
}
