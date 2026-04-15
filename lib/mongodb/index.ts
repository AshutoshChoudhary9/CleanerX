import { Cart, Collection as CollectionType, Menu, Product as ProductType } from 'lib/shopify/types';
import { cookies } from 'next/headers';
import connectToDatabase from './db';
import CartModel from './models/Cart';
import Collection from './models/Collection';
import Product from './models/Product';
import { verifyAuthToken } from 'lib/auth/jwt';

export async function getProducts({ query, reverse, sortKey, category }: { query?: string; reverse?: boolean; sortKey?: string; category?: string }): Promise<ProductType[]> {
  await connectToDatabase();
  let filter: any = {};
  if (query) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter = { $or: [{ title: new RegExp(escapedQuery, 'i') }, { tags: new RegExp(escapedQuery, 'i') }] };
  }
  
  if (category && category !== 'all') {
    filter.tags = { $regex: category, $options: 'i' };
  }

  let sort: any = {};
  if (sortKey === 'PRICE') sort['variants.0.price.amount'] = reverse ? -1 : 1;
  else if (sortKey === 'CREATED_AT') sort.createdAt = reverse ? -1 : 1;

  const products = await Product.find(filter).collation({ locale: 'en_US', numericOrdering: true }).sort(sort).lean();
  return products.map(p => ({
    ...p,
    id: p._id.toString(),
    _id: p._id.toString()
  })) as unknown as ProductType[];
}

export async function getProduct(handle: string): Promise<ProductType | undefined> {
  await connectToDatabase();
  const product = await Product.findOne({ handle }).lean();
  if (!product) return undefined;
  return { ...product, id: product._id.toString(), _id: product._id.toString() } as unknown as ProductType;
}

export async function getCollections(): Promise<CollectionType[]> {
  await connectToDatabase();
  const collections = await Collection.find({}).lean();
  const reshapedCollections = collections.map(c => ({ ...c, id: c._id.toString(), _id: c._id.toString() }));
  const allCollection = {
    handle: '',
    title: 'All',
    description: 'All products',
    seo: { title: 'All', description: 'All products' },
    path: '/search',
    updatedAt: new Date().toISOString()
  };
  return [allCollection, ...reshapedCollections] as unknown as CollectionType[];
}

export async function getCollection(handle: string): Promise<CollectionType | undefined> {
  await connectToDatabase();
  const collection = await Collection.findOne({ handle }).lean();
  if (!collection) return undefined;
  return { ...collection, id: collection._id.toString(), _id: collection._id.toString() } as unknown as CollectionType;
}

export async function getCollectionProducts({ collection }: { collection: string }): Promise<ProductType[]> {
  await connectToDatabase();
  const products = await Product.find({ tags: collection }).lean();
  return products.map(p => ({ ...p, id: p._id.toString(), _id: p._id.toString() })) as unknown as ProductType[];
}

export async function getMenu(handle: string): Promise<Menu[]> {
  if (handle === 'next-js-commerce-footer-menu') {
    return [
      { title: 'About Us', path: '/about' },
      { title: 'Contact', path: '/contact' },
      { title: 'Privacy Policy', path: '/privacy' },
    ];
  }
  return [
    { title: 'All', path: '/search' },
    { title: 'Bathroom', path: '/search/bathroom-cleaners' },
    { title: 'Windows', path: '/search/window-care' },
    { title: 'Eco Friendly', path: '/search/eco-friendly' },
  ];
}

// ── Cart Logic ──
export async function getCartById(cartId: string): Promise<Cart | undefined> {
  await connectToDatabase();
  const cartDoc = await CartModel.findOne({ cartId }).lean();
  if (!cartDoc) return undefined;

  const lines = await Promise.all(cartDoc.items.map(async (item: any) => {
    // merchandiseId can be a product _id, handle, or variant id
    const product = await Product.findOne({
      $or: [
        { _id: item.merchandiseId.length === 24 ? item.merchandiseId : undefined },
        { handle: item.merchandiseId },
        { 'variants.id': item.merchandiseId }
      ].filter(Boolean)
    }).lean();
    
    if (!product) return null;

    let variant = product.variants.find((v: any) => v.id === item.merchandiseId);
    if (!variant && product.variants.length > 0) variant = product.variants[0];
    if (!variant) return null;

    return {
      id: item.id,
      quantity: item.quantity,
      cost: {
        totalAmount: {
          amount: (parseFloat(variant.price.amount) * item.quantity).toFixed(2),
          currencyCode: variant.price.currencyCode || 'INR'
        }
      },
      merchandise: {
        id: variant.id,
        title: variant.title,
        selectedOptions: variant.selectedOptions,
        product: {
          id: product._id.toString(),
          handle: product.handle,
          title: product.title,
          featuredImage: product.featuredImage,
          tags: product.tags
        }
      }
    };
  }));

  const activeLines = lines.filter(Boolean) as any[];
  const subtotal = activeLines.reduce((acc, line: any) => acc + parseFloat(line.cost.totalAmount.amount), 0);
  const totalQuantity = activeLines.reduce((acc, line: any) => acc + line.quantity, 0);
  const currencyCode = activeLines.length > 0 ? activeLines[0].cost.totalAmount.currencyCode : 'INR';

  return {
    id: cartId,
    checkoutUrl: '',
    cost: {
      subtotalAmount: { amount: subtotal.toFixed(2), currencyCode },
      totalAmount: { amount: subtotal.toFixed(2), currencyCode },
      totalTaxAmount: { amount: '0.00', currencyCode }
    },
    lines: activeLines,
    totalQuantity
  } as unknown as Cart;
}

export async function getCart(token?: string): Promise<Cart | undefined> {
  const cartId = (await cookies()).get('cartId')?.value;
  const authToken = token || (await cookies()).get('authToken')?.value;
  
  await connectToDatabase();

  if (authToken) {
    try {
      const user = verifyAuthToken(authToken);
      if (user) {
        let cartDoc = await CartModel.findOne({ userId: user.userId });
        
        // If guest cart exists, merge it into the user cart (or take it over)
        if (cartId) {
          const guestCart = await CartModel.findOne({ cartId, userId: { $exists: false } });
          if (guestCart && guestCart.items.length > 0) {
            if (!cartDoc) {
              // User has no cart, just take over the guest cart
              cartDoc = await CartModel.findOneAndUpdate(
                { cartId },
                { $set: { userId: user.userId } },
                { new: true }
              );
            } else {
              // Both exist, merge items
              for (const guestItem of guestCart.items) {
                const existingIndex = cartDoc.items.findIndex((i: any) => i.merchandiseId === guestItem.merchandiseId);
                if (existingIndex > -1) {
                  cartDoc.items[existingIndex].quantity += guestItem.quantity;
                } else {
                  cartDoc.items.push(guestItem);
                }
              }
              cartDoc.markModified('items');
              await cartDoc.save();
              // Delete the now-redundant guest cart
              await CartModel.deleteOne({ cartId });
            }
          } else if (!cartDoc && guestCart) {
            // Guest cart is empty but exists, just link it
            guestCart.userId = user.userId;
            await guestCart.save();
            cartDoc = guestCart;
          }
        }

        if (cartDoc) return getCartById(cartDoc.cartId);
      }
    } catch (e) {
      console.error('Auth token validation failure:', e);
    }
  }

  if (!cartId) return undefined;
  return getCartById(cartId);
}

export async function createCart(userId?: string): Promise<Cart> {
  const cartId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  await connectToDatabase();
  const cart = new CartModel({ cartId, items: [], userId });
  await cart.save();

  (await cookies()).set('cartId', cartId, { path: '/', sameSite: 'lax', httpOnly: true });
  return getCartById(cartId) as any;
}

export async function addToCart(lines: { merchandiseId: string; quantity: number }[], userId?: string): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value;
  await connectToDatabase();

  let cart = userId ? await CartModel.findOne({ userId }) : (cartId ? await CartModel.findOne({ cartId }) : null);

  if (!cart) {
    const newCartId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    cart = new CartModel({ cartId: newCartId, items: [], userId });
    (await cookies()).set('cartId', newCartId, { path: '/', sameSite: 'lax', httpOnly: true });
  }

  for (const line of lines) {
    const existingIndex = cart.items.findIndex((item: any) => item.merchandiseId === line.merchandiseId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += line.quantity;
      if (cart.items[existingIndex].quantity < 1) cart.items.splice(existingIndex, 1);
    } else if (line.quantity > 0) {
      cart.items.push({ id: Math.random().toString(36).substring(2), merchandiseId: line.merchandiseId, quantity: line.quantity });
    }
  }

  cart.markModified('items');
  await cart.save();
  return getCartById(cart.cartId) as any;
}

export async function removeFromCart(merchandiseIds: string[], userId?: string): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value;
  await connectToDatabase();
  const cart = userId ? await CartModel.findOne({ userId }) : (cartId ? await CartModel.findOne({ cartId }) : null);
  
  if (cart) {
    cart.items = cart.items.filter((item: any) => !merchandiseIds.includes(item.merchandiseId));
    await cart.save();
    return getCartById(cart.cartId) as any;
  }
  return { lines: [], totalQuantity: 0 } as any;
}

export async function clearCart(userId?: string): Promise<void> {
  await connectToDatabase();
  if (userId) {
    await CartModel.deleteOne({ userId });
  } else {
    const cartId = (await cookies()).get('cartId')?.value;
    if (cartId) await CartModel.deleteOne({ cartId });
  }
  (await cookies()).delete('cartId');
}

export async function getPage(handle: string) {
  const knownPages: Record<string, { title: string; body: string; handle: string; updatedAt: string }> = {
    privacy: { title: 'Privacy Policy', body: '<p>Our privacy policy.</p>', handle: 'privacy', updatedAt: new Date().toISOString() },
    about: { title: 'About Us', body: '<p>About FreshGuard.</p>', handle: 'about', updatedAt: new Date().toISOString() },
    contact: { title: 'Contact', body: '<p>Contact us at support@freshguard.in</p>', handle: 'contact', updatedAt: new Date().toISOString() },
  };
  return knownPages[handle] ?? undefined;
}

export async function getProductRecommendations(productId: string) {
  await connectToDatabase();
  const currentProduct = productId.length === 24 ? await Product.findById(productId).lean() : await Product.findOne({ handle: productId }).lean();
  const recommendations = await Product.find({
    _id: { $ne: currentProduct?._id },
    ...(currentProduct?.tags?.length ? { tags: { $in: currentProduct.tags } } : {})
  }).limit(4).lean();
  return recommendations.map(p => ({ ...p, id: p._id.toString(), _id: p._id.toString() })) as unknown as ProductType[];
}
