import { NextRequest, NextResponse } from 'next/server';
import { getCart } from 'lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const cart = await getCart();
    return NextResponse.json({
      cart: cart || { lines: [], cost: { totalAmount: { amount: '0.00', currencyCode: 'INR' } }, totalQuantity: 0 }
    });
  } catch (err) {
    console.error('Cart API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}
