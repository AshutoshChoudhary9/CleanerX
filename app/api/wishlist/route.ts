import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Wishlist from 'lib/mongodb/models/Wishlist';
import { requireAuth } from 'lib/middleware/auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const wishlist = await Wishlist.findOne({ userId: user.userId }).lean();
    return NextResponse.json({
      wishlist: wishlist || { userId: user.userId, products: [] }
    });
  } catch (err) {
    console.error('Wishlist Fetch API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}
