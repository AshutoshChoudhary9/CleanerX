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
    // Admin check — ADMIN_PASSWORD must be set in environment
    const authHeader = req.headers.get('authorization');
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass || authHeader !== `Bearer ${adminPass}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { name, price, mrp, volume, category, fragrance, description, imageUrl } = body;

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
      featuredImage: { 
        url: imageUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&h=400&auto=format&fit=crop', 
        altText: name, 
        width: 400, 
        height: 400 
      },
      images: imageUrl ? [{ url: imageUrl, altText: name, width: 400, height: 400 }] : [],
      seo: { title: name, description: description || name },
      tags: [category, fragrance, ...(body.tags ? body.tags.split(',').map((t: string) => t.trim()) : [])].filter(Boolean),
      metadata: body.metadata || {},
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
    // Admin check — ADMIN_PASSWORD must be set in environment
    const authHeader = req.headers.get('authorization');
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass || authHeader !== `Bearer ${adminPass}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { id, price, mrp, tags, title, vol, imageUrl } = body;
    
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
    if (imageUrl) {
      update['featuredImage.url'] = imageUrl;
      update['images'] = [{ url: imageUrl, altText: title || 'Product Image', width: 400, height: 400 }];
    }
    if (body.metadata) update.metadata = body.metadata;

    const product = await Product.findByIdAndUpdate(id, { $set: update }, { new: true });
    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error('Update Product Error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Admin check — ADMIN_PASSWORD must be set in environment
    const authHeader = req.headers.get('authorization');
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass || authHeader !== `Bearer ${adminPass}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  { id: 'classic-floor-1', handle: 'classic-floor-1', title: 'FreshGuard Classic Floor Cleaner', icon: '🧴', price: 149, mrp: 199, tags: ['floor'], vol: '1 Litre', rating: 4.5, ratingCount: 2341, badge: 'Best Seller', variants: [{ id: 'classic-floor-1-v', title: '1 Litre', price: { amount: '149', currencyCode: 'INR' } }] },
  { id: 'lavender-floor-2', handle: 'lavender-floor-2', title: 'FreshGuard Lavender Floor Liquid', icon: '💜', price: 169, mrp: 229, tags: ['floor'], vol: '2 Litre', rating: 4.3, ratingCount: 1892, badge: 'Top Rated', variants: [{ id: 'lavender-floor-2-v', title: '2 Litre', price: { amount: '169', currencyCode: 'INR' } }] },
  { id: 'toilet-gel-750', handle: 'toilet-gel-750', title: 'FreshGuard HyperClean Toilet Gel', icon: '🚽', price: 129, mrp: 169, tags: ['toilet'], vol: '750 ml', rating: 4.7, ratingCount: 3421, badge: 'Best Seller', variants: [{ id: 'toilet-gel-750-v', title: '750 ml', price: { amount: '129', currencyCode: 'INR' } }] },
  { id: 'glass-spray-500', handle: 'glass-spray-500', title: 'FreshGuard ClearView Glass Spray', icon: '🪟', price: 119, mrp: 159, tags: ['glass'], vol: '500 ml', rating: 4.6, ratingCount: 1876, badge: 'Best Seller', variants: [{ id: 'glass-spray-500-v', title: '500 ml', price: { amount: '119', currencyCode: 'INR' } }] },
  { id: 'combo-essentials-3', handle: 'combo-essentials-3', title: 'Home Essentials Combo Pack', icon: '📦', price: 399, mrp: 499, tags: ['combo'], vol: '3-Pack', rating: 4.9, ratingCount: 452, badge: 'Value Pack', variants: [{ id: 'combo-3-v', title: '3-Pack', price: { amount: '399', currencyCode: 'INR' } }] },
  { id: 'bulk-floor-20', handle: 'bulk-floor-20', title: 'Bulk Industrial Floor Disinfectant', icon: '🏭', price: 1299, mrp: 1699, tags: ['bulk'], vol: '20 Litre', rating: 4.8, ratingCount: 124, badge: 'Factory Price', variants: [{ id: 'bulk-20-v', title: '20 Litre', price: { amount: '1299', currencyCode: 'INR' } }] },
  { id: 'festive-sparkle-pack', handle: 'festive-sparkle-pack', title: 'Festive Shine Limited Edition', icon: '🎉', price: 299, mrp: 399, tags: ['festive'], vol: 'Limited Edition', rating: 4.7, ratingCount: 89, badge: 'Seasonal', variants: [{ id: 'festive-v', title: 'Limited Edition', price: { amount: '299', currencyCode: 'INR' } }] },
  { id: 'monthly-protection-sub', handle: 'monthly-protection-sub', title: 'Monthly Protection Membership', icon: '🔁', price: 449, mrp: 549, tags: ['subscribe'], vol: 'Monthly', rating: 5.0, ratingCount: 1205, badge: 'Subscription', variants: [{ id: 'sub-v', title: 'Monthly', price: { amount: '449', currencyCode: 'INR' } }] },
  // Deal of the Day Products
  { id: 'ecogreen-all-purpose-cleaner', handle: 'ecogreen-all-purpose-cleaner', title: 'EcoGreen All-Purpose', icon: '🧴', price: 99, mrp: 179, tags: ['eco-friendly', 'floor'], vol: '500ml', rating: 4.5, ratingCount: 10, badge: 'Hot', variants: [{ id: 'ecogreen-v1', title: '500ml', price: { amount: '99', currencyCode: 'INR' } }] },
  { id: 'max-power-bathroom-cleaner', handle: 'max-power-bathroom-cleaner', title: 'Max Power Bathroom', icon: '🚽', price: 129, mrp: 229, tags: ['bathroom-cleaners', 'toilet'], vol: 'Spray', rating: 4.5, ratingCount: 10, badge: 'Hot', variants: [{ id: 'maxpower-v1', title: 'Spray', price: { amount: '129', currencyCode: 'INR' } }] },
  { id: 'crystal-clear-window-cleaner', handle: 'crystal-clear-window-cleaner', title: 'Crystal Clear Window', icon: '🪟', price: 119, mrp: 199, tags: ['window-care', 'glass'], vol: '1L', rating: 4.5, ratingCount: 10, badge: 'Hot', variants: [{ id: 'crystal-v1', title: '1L', price: { amount: '119', currencyCode: 'INR' } }] },
  { id: 'industrial-degreaser-pro', handle: 'industrial-degreaser-pro', title: 'Industrial Degreaser', icon: '🏠', price: 599, mrp: 999, tags: ['general'], vol: '750ml', rating: 4.5, ratingCount: 10, badge: 'Hot', variants: [{ id: 'industrial-v1', title: '750ml', price: { amount: '599', currencyCode: 'INR' } }] },
  { id: 'purefresh-disinfecting-wipes', handle: 'purefresh-disinfecting-wipes', title: 'PureFresh Wipes', icon: '💜', price: 99, mrp: 179, tags: ['general'], vol: '80 Wipes', rating: 4.5, ratingCount: 10, badge: 'Hot', variants: [{ id: 'wipes-v1', title: '80 Wipes', price: { amount: '99', currencyCode: 'INR' } }] },
];
