import { NextRequest, NextResponse } from 'next/server';
import { clearCart } from 'lib/mongodb';
import { requireAuth } from 'lib/middleware/auth';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await clearCart(user.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear Cart API Error:', err);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}
