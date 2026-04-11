import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Wishlist from 'lib/mongodb/models/Wishlist';
import Product from 'lib/mongodb/models/Product';
import { requireAuth } from 'lib/middleware/auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const wishlist = await Wishlist.findOne({ userId: user.userId }).lean();
    if (!wishlist || !wishlist.products.length) {
      return NextResponse.json({ wishlist: { userId: user.userId, products: [] } });
    }

    // Manually join with Products
    const productDocs = await Product.find({ 
      $or: [
        { _id: { $in: wishlist.products.filter((id: string) => id.length === 24) } },
        { id: { $in: wishlist.products } }
      ]
    }).lean();

    const populatedProducts = wishlist.products.map((id: string) => {
      const p = productDocs.find((doc: any) => doc._id.toString() === id || doc.id === id);
      if (!p) return null;
      return {
        ...p,
        id: p.id || p._id.toString()
      };
    }).filter(Boolean);

    return NextResponse.json({
      wishlist: { ...wishlist, products: populatedProducts }
    });
  } catch (err) {
    console.error('Wishlist Fetch API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}
