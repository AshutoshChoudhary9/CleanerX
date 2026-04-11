import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from 'lib/mongodb/db';
import User from 'lib/mongodb/models/User';
import { signAuthToken } from 'lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, email, password } = body as { name?: string; email?: string; password?: string };

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    const token = signAuthToken({ userId: user._id.toString(), email: user.email, name: user.name });

    return NextResponse.json(
      {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Register API Error:', err);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
