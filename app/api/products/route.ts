import connectToDatabase from 'lib/mongodb/db';
import Product from 'lib/mongodb/models/Product';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || '';

    const escapeRegex = (string: string) => {
      return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    let filter: any = {};
    if (query) {
      const escapedQuery = escapeRegex(query);
      filter.$or = [
        { title: new RegExp(escapedQuery, 'i') },
        { tags: new RegExp(escapedQuery, 'i') },
      ];
    }
    if (category && category !== 'all') {
      const escapedCategory = escapeRegex(category);
      filter.tags = { $regex: escapedCategory, $options: 'i' };
    }

    const products = await Product.find(filter).limit(24).lean();

    // If no products in DB, return static seed data (optionally filtered by category)
    if (!products.length && !query) {
      if (!category || category === 'all') {
        return NextResponse.json({ products: SEED_PRODUCTS });
      }
      const filteredSeed = SEED_PRODUCTS.filter(p => 
        p.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      );
      return NextResponse.json({ products: filteredSeed });
    }

    return NextResponse.json({
      products: products.map(p => ({
        ...p,
        id: p._id.toString(),
        _id: p._id.toString(),
      }))
    });
  } catch (err) {
    console.error('Products API Error:', err);
    return NextResponse.json({ products: SEED_PRODUCTS });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, price, mrp, volume, category, fragrance, description } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const handle = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const priceStr = price.toString();
    const mrpStr = (mrp || Math.round(price * 1.3)).toString();

    const product = new Product({
      handle,
      title: name,
      availableForSale: true,
      description: description || `${name} - ${volume || 'Standard'}`,
      descriptionHtml: `<p>${description || name}</p>`,
      options: [{ id: 'vol', name: 'Volume', values: [volume || 'Standard'] }],
      priceRange: {
        minVariantPrice: { amount: priceStr, currencyCode: 'INR' },
        maxVariantPrice: { amount: mrpStr, currencyCode: 'INR' },
      },
      variants: [{
        id: handle + '-v1',
        title: volume || 'Standard',
        availableForSale: true,
        selectedOptions: [{ name: 'Volume', value: volume || 'Standard' }],
        price: { amount: priceStr, currencyCode: 'INR' },
      }],
      featuredImage: { url: '', altText: name, width: 400, height: 400 },
      images: [],
      seo: { title: name, description: description || name },
      tags: [category, fragrance].filter(Boolean),
    });

    await product.save();
    return NextResponse.json({ success: true, product: { ...product.toObject(), id: product._id.toString() } });
  } catch (err) {
    console.error('Add Product Error:', err);
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, price, mrp, tags, title, vol } = body;

    const update: any = {};
    if (title) update.title = title;
    if (price !== undefined) {
      update['priceRange.minVariantPrice.amount'] = price.toString();
      update['variants.0.price.amount'] = price.toString();
    }
    if (mrp !== undefined) {
      update['priceRange.maxVariantPrice.amount'] = mrp.toString();
    }
    if (tags) update.tags = Array.isArray(tags) ? tags : [tags];
    if (vol) {
      update['variants.0.title'] = vol;
      update['variants.0.selectedOptions.0.value'] = vol;
    }

    const product = await Product.findByIdAndUpdate(id, { $set: update }, { new: true });
    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error('Update Product Error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await Product.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete Product Error:', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

// Static seed data when DB is empty
const SEED_PRODUCTS = [
  { id: '1', title: 'FreshGuard Classic Floor Cleaner', icon: '🧴', price: 149, mrp: 199, tags: ['floor'], vol: '1 Litre', rating: 4.5, ratingCount: 2341, badge: 'Best Seller' },
  { id: '2', title: 'FreshGuard Lavender Floor Liquid', icon: '💜', price: 169, mrp: 229, tags: ['floor'], vol: '2 Litre', rating: 4.3, ratingCount: 1892, badge: 'Top Rated' },
  { id: '3', title: 'FreshGuard Pine Fresh Concentrate', icon: '🌲', price: 129, mrp: 179, tags: ['floor'], vol: '500 ml', rating: 4.6, ratingCount: 876, badge: 'New' },
  { id: '4', title: 'FreshGuard Lemon Burst Disinfectant', icon: '🍋', price: 189, mrp: 259, tags: ['floor'], vol: '5 Litre', rating: 4.4, ratingCount: 1203, badge: 'Hot' },
  { id: '5', title: 'FreshGuard HyperClean Toilet Gel', icon: '🚽', price: 129, mrp: 169, tags: ['toilet'], vol: '750 ml', rating: 4.7, ratingCount: 3421, badge: 'Best Seller' },
  { id: '6', title: 'FreshGuard Thick Foam Toilet Cleaner', icon: '🧼', price: 149, mrp: 199, tags: ['toilet'], vol: '1 Litre', rating: 4.2, ratingCount: 987, badge: 'Hot' },
  { id: '7', title: 'FreshGuard Ocean Fresh Toilet Gel', icon: '🌊', price: 119, mrp: 159, tags: ['toilet'], vol: '500 ml', rating: 4.5, ratingCount: 654, badge: 'New' },
  { id: '8', title: 'FreshGuard Pro Toilet Disinfectant', icon: '⚗️', price: 199, mrp: 279, tags: ['toilet'], vol: '1.5 Litre', rating: 4.8, ratingCount: 2109, badge: 'Top Rated' },
  { id: '9', title: 'FreshGuard ClearView Glass Spray', icon: '🪟', price: 119, mrp: 159, tags: ['glass'], vol: '500 ml', rating: 4.6, ratingCount: 1876, badge: 'Best Seller' },
  { id: '10', title: 'FreshGuard Streak-Free Mirror Cleaner', icon: '🪞', price: 139, mrp: 189, tags: ['glass'], vol: '750 ml', rating: 4.4, ratingCount: 1234, badge: 'Top Rated' },
  { id: '11', title: 'FreshGuard Anti-Fog Glass Protector', icon: '🔭', price: 179, mrp: 239, tags: ['glass'], vol: '500 ml', rating: 4.3, ratingCount: 567, badge: 'New' },
  { id: '12', title: 'FreshGuard Ultra Shine Glass Liquid', icon: '✨', price: 159, mrp: 219, tags: ['glass'], vol: '1 Litre', rating: 4.5, ratingCount: 2341, badge: 'Hot' },
  { id: '13', title: 'FreshGuard Home Essentials Combo', icon: '📦', price: 399, mrp: 499, tags: ['combo'], vol: '3-Pack', rating: 4.9, ratingCount: 452, badge: 'Value Pack' },
  { id: '14', title: 'FreshGuard Bulk Floor Disinfectant', icon: '🏭', price: 1299, mrp: 1699, tags: ['bulk'], vol: '20 Litre', rating: 4.8, ratingCount: 124, badge: 'Factory Price' },
  { id: '15', title: 'FreshGuard Festive Sparkle Pack', icon: '🎉', price: 299, mrp: 399, tags: ['festive'], vol: 'Limited Edition', rating: 4.7, ratingCount: 89, badge: 'Seasonal' },
  { id: '16', title: 'FreshGuard Monthly Protection Plan', icon: '🔁', price: 449, mrp: 549, tags: ['subscribe'], vol: 'Monthly', rating: 5.0, ratingCount: 1205, badge: 'Subscription' },
];
