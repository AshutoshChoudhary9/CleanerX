import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import UserCart from 'lib/mongodb/models/UserCart';
import { requireAuth } from 'lib/middleware/auth';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { productId, quantity = 1 } = body as { productId?: string; quantity?: number };

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const cart = await UserCart.findOneAndUpdate(
      { userId: user.userId },
      { $setOnInsert: { userId: user.userId, products: [] } },
      { new: true, upsert: true }
    );

    const existing = cart.products.find((p) => p.productId === productId);
    if (existing) {
      existing.quantity += Math.max(1, quantity);
    } else {
      cart.products.push({ productId, quantity: Math.max(1, quantity) });
    }

    await cart.save();
    return NextResponse.json({ cart });
  } catch (err) {
    console.error('Cart Add API Error:', err);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}
