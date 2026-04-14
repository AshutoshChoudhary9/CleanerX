import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCartById } from 'lib/mongodb';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, currency = 'INR', receipt } = body;

    if (!cartId) {
      return NextResponse.json({ error: 'Cart ID is required' }, { status: 400 });
    }

    const cart = await getCartById(cartId);
    if (!cart || !cart.lines.length) {
      return NextResponse.json({ error: 'Empty or invalid cart' }, { status: 400 });
    }

    const totalAmount = parseFloat(cart.cost.totalAmount.amount);

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid cart total' }, { status: 400 });
    }

    const options = {
      amount: Math.round(totalAmount * 100), // convert ₹ to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay Error:', err);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
