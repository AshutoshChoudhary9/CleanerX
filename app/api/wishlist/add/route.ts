import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Wishlist from 'lib/mongodb/models/Wishlist';
import { requireAuth } from 'lib/middleware/auth';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { productId } = body as { productId?: string };
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: user.userId },
      {
        $setOnInsert: { userId: user.userId },
        $addToSet: { products: productId }
      },
      { returnDocument: 'after', upsert: true }
    ).lean();

    return NextResponse.json({ wishlist });
  } catch (err) {
    console.error('Wishlist Add API Error:', err);
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}
