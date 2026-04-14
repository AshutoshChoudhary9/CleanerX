import { Cart, Collection as CollectionType, Menu, Product as ProductType } from 'lib/shopify/types';
import { cookies } from 'next/headers';
import connectToDatabase from './db';
import CartModel from './models/Cart';
import Collection from './models/Collection';
import Product from './models/Product';

export async function getProducts({ query, reverse, sortKey }: { query?: string; reverse?: boolean; sortKey?: string }): Promise<ProductType[]> {
  await connectToDatabase();
  let filter = {};
  if (query) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter = { $or: [{ title: new RegExp(escapedQuery, 'i') }, { tags: new RegExp(escapedQuery, 'i') }] };
  }

  let sort: any = {};
  if (sortKey === 'PRICE') sort['priceRange.minVariantPrice.amount'] = reverse ? -1 : 1;
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
  // Mocking menu for now
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

// Cart Logic
export async function getCartById(cartId: string): Promise<Cart | undefined> {
  await connectToDatabase();
  const cartDoc = await CartModel.findOne({ cartId }).lean();
  if (!cartDoc) return undefined;

  // We need to populate the product data for each cart item
  const lines = await Promise.all(cartDoc.items.map(async (item: any) => {
    // Find product that has this variant ID
    const product = await Product.findOne({ 'variants.id': item.merchandiseId }).lean();
    if (!product) return null;

    const variant = product.variants.find((v: any) => v.id === item.merchandiseId);
    if (!variant) return null;

    return {
      id: item.id,
      quantity: item.quantity,
      cost: {
        totalAmount: {
          amount: (parseFloat(variant.price.amount) * item.quantity).toFixed(2),
          currencyCode: variant.price.currencyCode
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
          featuredImage: product.featuredImage
        }
      }
    };
  }));

  const activeLines = lines.filter(Boolean) as any[];
  const subtotal = activeLines.reduce((acc, line: any) => acc + parseFloat(line.cost.totalAmount.amount), 0);
  const totalQuantity = activeLines.reduce((acc, line: any) => acc + line.quantity, 0);
  const currencyCode = activeLines.length > 0 ? activeLines[0].cost.totalAmount.currencyCode : 'INR'; // Default to INR if empty

  return {
    id: cartId,
    checkoutUrl: '', // This will be handled by Razorpay
    cost: {
      subtotalAmount: { amount: subtotal.toFixed(2), currencyCode },
      totalAmount: { amount: subtotal.toFixed(2), currencyCode },
      totalTaxAmount: { amount: '0.00', currencyCode }
    },
    lines: activeLines,
    totalQuantity
  } as unknown as Cart;
}

export async function getCart(): Promise<Cart | undefined> {
  const cartId = (await cookies()).get('cartId')?.value;
  // If we have an authToken cookie, we should check for user cart too
  const authToken = (await cookies()).get('authToken')?.value;
  
  await connectToDatabase();

  if (authToken) {
    try {
      const { verifyAuthToken } = require('lib/auth/jwt');
      const user = verifyAuthToken(authToken);
      if (user) {
        // Try to find cart by userId
        const cartDoc = await CartModel.findOne({ userId: user.userId }).lean();
        if (cartDoc) return getCartById(cartDoc.cartId);
      }
    } catch (e) {
      console.error('Auth token validation failed in getCart:', e);
    }
  }

  if (!cartId) return undefined;
  return getCartById(cartId);
}

export async function getCartByUserId(userId: string): Promise<Cart | undefined> {
  await connectToDatabase();
  const cartDoc = await CartModel.findOne({ userId }).lean();
  if (!cartDoc) return undefined;
  return getCartById(cartDoc.cartId);
}

export async function createCart(): Promise<Cart> {
  const cartId = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  await connectToDatabase();
  const cart = new CartModel({ cartId, items: [] });
  await cart.save();

  // Set cookie for the new cart
  (await cookies()).set('cartId', cartId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true
  });

  return {
    id: cartId,
    checkoutUrl: '',
    cost: {
      subtotalAmount: { amount: '0.00', currencyCode: 'INR' },
      totalAmount: { amount: '0.00', currencyCode: 'INR' },
      totalTaxAmount: { amount: '0.00', currencyCode: 'INR' }
    },
    lines: [],
    totalQuantity: 0
  } as unknown as Cart;
}

export async function addToCart(lines: { merchandiseId: string; quantity: number }[], providedCartId?: string): Promise<Cart> {
  let cartId = providedCartId || (await cookies()).get('cartId')?.value;

  await connectToDatabase();
  let cart = cartId ? await CartModel.findOne({ cartId }) : null;

  if (!cart) {
    cartId = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    cart = new CartModel({ cartId, items: [] });
  }

  for (const line of lines) {
    const existingIndex = cart.items.findIndex((item: any) => item.merchandiseId === line.merchandiseId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += line.quantity;
    } else {
      cart.items.push({ id: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2), ...line });
    }
  }

  cart.markModified('items');
  await cart.save();
  return (await getCartById(cartId as string)) as Cart;
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) return createCart();

  await connectToDatabase();
  const cart = await CartModel.findOne({ cartId });
  if (!cart) return createCart();

  cart.items = cart.items.filter((item: any) => !lineIds.includes(item.id));
  await cart.save();
  return (await getCartById(cartId)) as Cart;
}

export async function updateCart(lines: { id: string; merchandiseId: string; quantity: number }[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) return createCart();

  await connectToDatabase();
  const cart = await CartModel.findOne({ cartId });
  if (!cart) return createCart();

  for (const line of lines) {
    const existingIndex = cart.items.findIndex((item: any) => item.id === line.id);
    if (existingIndex > -1) {
      if (line.quantity === 0) {
        cart.items.splice(existingIndex, 1);
      } else {
        cart.items[existingIndex].quantity = line.quantity;
      }
    }
  }

  cart.markModified('items');
  await cart.save();
  return (await getCartById(cartId)) as Cart;
}

export async function getPage(handle: string) {
  return { title: 'Page', body: 'Page Content', handle };
}

export async function getPages() {
  return [];
}

export async function getProductRecommendations(productId: string) {
  await connectToDatabase();
  // Find the current product to get its tags
  const currentProduct = await Product.findById(productId).lean();
  
  // Find products that are NOT the current one, ideally matching tags
  const recommendations = await Product.find({
    _id: { $ne: productId },
    ...(currentProduct?.tags?.length ? { tags: { $in: currentProduct.tags } } : {})
  }).limit(4).lean();
  
  return recommendations.map(p => ({ ...p, id: p._id.toString(), _id: p._id.toString() })) as unknown as ProductType[];
}

export async function revalidate() {
  return;
}
