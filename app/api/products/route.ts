import connectToDatabase from 'lib/mongodb/db';
import Product from 'lib/mongodb/models/Product';
import { SEED_PRODUCTS } from 'lib/mongodb/seed-data';
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

// Removed local SEED_PRODUCTS definition
