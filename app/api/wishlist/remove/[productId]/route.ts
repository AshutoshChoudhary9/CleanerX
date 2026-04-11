import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Wishlist from 'lib/mongodb/models/Wishlist';
import { requireAuth } from 'lib/middleware/auth';

type Params = {
  params: Promise<{ productId: string }>;
};

export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const { productId } = await params;

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: user.userId },
      { $pull: { products: productId } },
      { returnDocument: 'after' }
    ).lean();

    return NextResponse.json({ wishlist: wishlist || { userId: user.userId, products: [] } });
  } catch (err) {
    console.error('Wishlist Remove API Error:', err);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
