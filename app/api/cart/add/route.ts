import { NextRequest, NextResponse } from 'next/server';
import { addToCart } from 'lib/mongodb';
import { requireAuth } from 'lib/middleware/auth';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { productId, quantity = 1 } = body as { productId?: string; quantity?: number };

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Call the centralized addToCart which uses CartModel
    const cart = await addToCart([{ merchandiseId: productId, quantity }], undefined);

    return NextResponse.json({ cart });
  } catch (err) {
    console.error('Cart Add API Error:', err);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}
