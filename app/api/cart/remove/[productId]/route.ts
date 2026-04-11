import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import UserCart from 'lib/mongodb/models/UserCart';
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

    const cart = await UserCart.findOneAndUpdate(
      { userId: user.userId },
      { $pull: { products: { productId } } },
      { returnDocument: 'after' }
    ).lean();

    return NextResponse.json({ cart: cart || { userId: user.userId, products: [] } });
  } catch (err) {
    console.error('Cart Remove API Error:', err);
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
  }
}
