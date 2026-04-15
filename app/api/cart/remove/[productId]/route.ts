import { NextRequest, NextResponse } from 'next/server';
import { removeFromCart } from 'lib/mongodb';
import { requireAuth } from 'lib/middleware/auth';

type Params = {
  params: Promise<{ productId: string }>;
};

export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const { productId } = await params;
    // central removeFromCart handles merchandiseId (which is what productId refers to here)
    const cart = await removeFromCart([productId], user.userId);

    return NextResponse.json({ cart });
  } catch (err) {
    console.error('Cart Remove API Error:', err);
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
  }
}
