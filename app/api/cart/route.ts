import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import UserCart from 'lib/mongodb/models/UserCart';
import { requireAuth } from 'lib/middleware/auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const cart = await UserCart.findOne({ userId: user.userId }).lean();
    return NextResponse.json({
      cart: cart || { userId: user.userId, products: [] }
    });
  } catch (err) {
    console.error('Cart Fetch API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}
