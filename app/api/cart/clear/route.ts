import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import UserCart from 'lib/mongodb/models/UserCart';
import { requireAuth } from 'lib/middleware/auth';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    await UserCart.findOneAndUpdate(
      { userId: user.userId },
      { $set: { products: [] } }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear Cart API Error:', err);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}
