import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Order from 'lib/mongodb/models/Order';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Simple admin authorization check using the owner password
    const authHeader = req.headers.get('authorization');
    if (authHeader !== 'Bearer admin123') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

import Product from 'lib/mongodb/models/Product';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { items, paymentMethod } = body;

    // Recalculate totalAmount server-side to prevent tampering
    const productIds = items.map((i: any) => i.id);
    const dbProducts = await Product.find({ 
      $or: [
        { _id: { $in: productIds.filter((id: string) => id.length === 24) } },
        { id: { $in: productIds } }
      ]
    }).lean();

    let serverTotal = 0;
    const validatedItems = items.map((item: any) => {
      const p = dbProducts.find((dbP: any) => dbP._id.toString() === item.id || dbP.id === item.id);
      if (!p) throw new Error(`Product not found: ${item.title}`);
      
      const price = parseFloat(p.price || p.priceRange?.minVariantPrice?.amount || '0');
      serverTotal += price * item.qty;
      
      return {
        ...item,
        price // Use server price
      };
    });

    // Handle discounts/fees logic server-side
    const delivery = serverTotal >= 299 || serverTotal === 0 ? 0 : 49;
    const comboDiscount = (serverTotal >= 299 && serverTotal > 0) ? 49 : 0;
    const upiDiscount = paymentMethod === 'upi' ? Math.round(serverTotal * 0.1) : 0;
    const codFee = paymentMethod === 'cod' ? 49 : 0;
    
    const finalTotal = Math.max(0, serverTotal + delivery - comboDiscount - upiDiscount + codFee);

    const order = new Order({
      ...body,
      items: validatedItems,
      totalAmount: finalTotal, // Overwrite with server calculated total
      orderId: body.orderId || `FG${Date.now()}`
    });
    
    await order.save();
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error('Create Order Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, orderId, status, razorpayPaymentId } = body;
    
    const query = id ? { _id: id } : { orderId: orderId };
    const update: any = { paymentStatus: status };
    if (razorpayPaymentId) update.razorpayPaymentId = razorpayPaymentId;

    const order = await Order.findOneAndUpdate(query, update, { new: true });
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('Update Order Error:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
