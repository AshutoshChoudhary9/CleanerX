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

    // Optimizing the query to handle product IDs and variant IDs
    const productIds = cart.products.map((p: any) => p.productId);
    const productDocs = await Product.find({ 
      $or: [
        { _id: { $in: productIds.filter((id: string) => id.length === 24) } },
        { handle: { $in: productIds } },
        { 'variants.id': { $in: productIds } }
      ]
    }).lean();

    let needsCleanup = false;
    const populatedProducts = cart.products.map((item: any) => {
      const p = productDocs.find((doc: any) => 
        doc._id.toString() === item.productId || 
        doc.handle === item.productId || 
        doc.variants.some((v: any) => v.id === item.productId)
      );
      
      if (!p) {
        needsCleanup = true;
        return null;
      }
      
      return {
        ...p,
        id: p._id.toString(),
        qty: item.quantity
      };
    }).filter(Boolean);

    // If some products were not found, clean up the cart document in background
    if (needsCleanup) {
      const validProductIds = populatedProducts.map((p: any) => p._id.toString());
      await UserCart.updateOne(
        { userId: user.userId },
        { $pull: { products: { productId: { $nin: productIds.filter(id => productDocs.some(p => p._id.toString() === id || p.handle === id || p.variants.some((v: any) => v.id === id))) } } } }
      );
      // More accurate cleanup:
      const keptProducts = cart.products.filter((item: any) => 
        productDocs.some((doc: any) => 
          doc._id.toString() === item.productId || 
          doc.handle === item.productId || 
          doc.variants.some((v: any) => v.id === item.productId)
        )
      );
      await UserCart.updateOne({ userId: user.userId }, { products: keptProducts });
    }

    return NextResponse.json({
      cart: { ...cart, products: populatedProducts }
    });
  } catch (err) {
    console.error('Cart Fetch API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}
