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

    // Atomic update to allow both increment and decrement
    let cart = await UserCart.findOneAndUpdate(
      { userId: user.userId, 'products.productId': productId },
      { $inc: { 'products.$.quantity': quantity } },
      { new: true }
    );

    if (!cart) {
      // Product not in cart, push new item
      cart = await UserCart.findOneAndUpdate(
        { userId: user.userId },
        { 
          $push: { products: { productId, quantity: Math.max(1, quantity) } },
          $setOnInsert: { userId: user.userId }
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ cart });
  } catch (err) {
    console.error('Cart Add API Error:', err);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}
