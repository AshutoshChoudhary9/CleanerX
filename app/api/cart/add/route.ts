import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import UserCart from 'lib/mongodb/models/UserCart';
import Product from 'lib/mongodb/models/Product';
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

    // 1. Verify product exists
    const product = await Product.findOne({
      $or: [
        { _id: productId.length === 24 ? productId : undefined },
        { handle: productId },
        { 'variants.id': productId }
      ].filter(Boolean)
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Atomic update to allow both increment and decrement
    // Note: We use Math.max for the increment if it's the first time, 
    // but for updates we need to be careful not to dip below 1.
    
    // Check current quantity if we are decrementing
    if (quantity < 0) {
      const existingCart = await UserCart.findOne({ userId: user.userId, 'products.productId': productId });
      if (existingCart) {
        const item = existingCart.products.find((p: any) => p.productId === productId);
        if (item && item.quantity + quantity < 1) {
          // Instead of going to 0 or negative, we can either remove or cap at 1.
          // Most e-commerce systems remove on 0, but since this is "add" API, 
          // let's cap at 1 or return error if they try to decrement too much.
          return NextResponse.json({ error: 'Quantity cannot be less than 1' }, { status: 400 });
        }
      }
    }

    let cart = await UserCart.findOneAndUpdate(
      { userId: user.userId, 'products.productId': productId },
      { $inc: { 'products.$.quantity': quantity } },
      { new: true, runValidators: true }
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
