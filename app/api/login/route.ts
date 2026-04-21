import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import connectToDatabase from 'lib/mongodb/db';
import User from 'lib/mongodb/models/User';
import { signAuthToken } from 'lib/auth/jwt';
import CartModel from 'lib/mongodb/models/Cart';

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

    // Set authToken cookie for Server Component accessibility
    (await cookies()).set('authToken', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    // --- Anonymous Cart Synchronization Logic ---
    try {
      const cartId = (await cookies()).get('cartId')?.value;
      if (cartId) {
        // Find anonymous cart
        const anonCart = await CartModel.findOne({ cartId });
        
        // Find if user already has a linked cart
        const userCart = await CartModel.findOne({ userId: user._id });

        if (anonCart) {
          if (userCart && userCart.cartId !== anonCart.cartId) {
            // Merge anonCart into userCart
            for (const item of anonCart.items) {
              const existingIndex = userCart.items.findIndex((i: any) => i.merchandiseId === item.merchandiseId);
              if (existingIndex > -1) {
                userCart.items[existingIndex].quantity += item.quantity;
              } else {
                userCart.items.push(item);
              }
            }
            await userCart.save();
            await CartModel.deleteOne({ cartId: anonCart.cartId });
            (await cookies()).set('cartId', userCart.cartId, { path: '/', sameSite: 'lax', httpOnly: true });
          } else if (!userCart) {
            // Link anonCart to user
            anonCart.userId = user._id;
            await anonCart.save();
          }
        } else if (userCart) {
          // No anonymous cart, but user has one from before
          (await cookies()).set('cartId', userCart.cartId, { path: '/', sameSite: 'lax', httpOnly: true });
        }
      } else {
        // No anonymous cart cookie, check if user has a saved cart
        const userCart = await CartModel.findOne({ userId: user._id });
        if (userCart) {
          (await cookies()).set('cartId', userCart.cartId, { path: '/', sameSite: 'lax', httpOnly: true });
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
