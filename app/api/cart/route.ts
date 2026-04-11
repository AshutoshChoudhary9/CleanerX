import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import UserCart from 'lib/mongodb/models/UserCart';
import Product from 'lib/mongodb/models/Product';
import { requireAuth } from 'lib/middleware/auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectToDatabase();
    const cart = await UserCart.findOne({ userId: user.userId }).lean();
    if (!cart || !cart.products.length) {
      return NextResponse.json({ cart: { userId: user.userId, products: [] } });
    }

    // Manually join with Products
    const productIds = cart.products.map((p: any) => p.productId);
    const productDocs = await Product.find({ 
      $or: [
        { _id: { $in: productIds.filter((id: string) => id.length === 24) } },
        { id: { $in: productIds } }
      ]
    }).lean();

    const populatedProducts = cart.products.map((item: any) => {
      const p = productDocs.find((doc: any) => doc._id.toString() === item.productId || doc.id === item.productId);
      if (!p) return null;
      return {
        ...p,
        id: p.id || p._id.toString(),
        qty: item.quantity
      };
    }).filter(Boolean);

    return NextResponse.json({
      cart: { ...cart, products: populatedProducts }
    });
  } catch (err) {
    console.error('Cart Fetch API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}
