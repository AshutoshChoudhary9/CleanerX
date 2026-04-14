import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import connectToDatabase from 'lib/mongodb/db';
import User from 'lib/mongodb/models/User';
import CartModel from 'lib/mongodb/models/Cart';
import UserCart from 'lib/mongodb/models/UserCart';
import { signAuthToken } from 'lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signAuthToken({ userId: user._id.toString(), email: user.email, name: user.name });

    // --- Anonymous Cart Synchronization Logic ---
    try {
      const cartId = (await cookies()).get('cartId')?.value;
      if (cartId) {
        const anonCart = await CartModel.findOne({ cartId });
        if (anonCart && anonCart.items.length > 0) {
          // Merge anonymous items into user cart
          let userCart = await UserCart.findOne({ userId: user._id });
          if (!userCart) {
            userCart = new UserCart({ userId: user._id, products: [] });
          }

          for (const item of anonCart.items) {
            // Mapping merchandiseId (variant id) to productId in UserCart
            const existingProduct = userCart.products.find((p: any) => p.productId === item.merchandiseId);
            if (existingProduct) {
              existingProduct.quantity += item.quantity;
            } else {
              userCart.products.push({ productId: item.merchandiseId, quantity: item.quantity });
            }
          }
          await userCart.save();
          
          // Clear anonymous cart after successful sync
          await CartModel.deleteOne({ cartId });
          (await cookies()).delete('cartId');
        }
      }
    } catch (syncErr) {
      console.error('Cart Sync Error during login:', syncErr);
      // We don't fail the login if sync fails, but we log it.
    }
    // --------------------------------------------

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
