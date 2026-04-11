import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Order from 'lib/mongodb/models/Order';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    // Admin only check should be here in a real app
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const order = new Order({
      ...body,
      orderId: body.orderId || `FG${Date.now()}`
    });
    await order.save();
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('Create Order Error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, status } = body;
    const order = await Order.findByIdAndUpdate(id, { paymentStatus: status }, { new: true });
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('Update Order Error:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
