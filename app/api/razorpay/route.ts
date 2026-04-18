import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

import connectToDatabase from 'lib/mongodb/db';
import Order from 'lib/mongodb/models/Order';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, currency = 'INR' } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    await connectToDatabase();
    const orderDoc = await Order.findOne({ orderId });
    if (!orderDoc) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const options = {
      amount: Math.round(Number(orderDoc.totalAmount) * 100), // convert ₹ to paise
      currency,
      receipt: orderId,
    };

    const rzpOrder = await razorpay.orders.create(options);
    
    // Update order with razorpayOrderId
    orderDoc.razorpayOrderId = rzpOrder.id;
    await orderDoc.save();

    return NextResponse.json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay Error:', err);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
