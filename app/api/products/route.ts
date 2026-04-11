import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from 'lib/mongodb/db';
import Product from 'lib/mongodb/models/Product';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || '';

    let filter: any = {};
    if (query) {
      filter.$or = [
        { title: new RegExp(query, 'i') },
        { tags: new RegExp(query, 'i') },
      ];
    }
    if (category && category !== 'all') {
      filter.tags = { $regex: category, $options: 'i' };
    }

    const products = await Product.find(filter).lean();

    // If no products in DB, return static seed data
    if (!products.length) {
      return NextResponse.json({ products: SEED_PRODUCTS });
    }

    return NextResponse.json({ products: products.map(p => ({
      ...p,
      id: p._id.toString(),
      _id: p._id.toString(),
    })) });
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

    if (!name || !price) {
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
    const { id, price, mrp, tags, title } = body;
    
    const update: any = {};
    if (title) update.title = title;
    if (price) {
      update['priceRange.minVariantPrice.amount'] = price.toString();
      update['variants.0.price.amount'] = price.toString();
    }
    if (mrp) {
      update['priceRange.maxVariantPrice.amount'] = mrp.toString();
    }
    if (tags) update.tags = Array.isArray(tags) ? tags : [tags];

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
  { id:'1', title:'FreshGuard Classic Floor Cleaner', icon:'🧴', price:149, mrp:199, tags:['floor'], vol:'1 Litre', rating:4.5, ratingCount:2341, badge:'Best Seller' },
  { id:'2', title:'FreshGuard Lavender Floor Liquid', icon:'💜', price:169, mrp:229, tags:['floor'], vol:'2 Litre', rating:4.3, ratingCount:1892, badge:'Top Rated' },
  { id:'3', title:'FreshGuard Pine Fresh Concentrate', icon:'🌲', price:129, mrp:179, tags:['floor'], vol:'500 ml', rating:4.6, ratingCount:876, badge:'New' },
  { id:'4', title:'FreshGuard Lemon Burst Disinfectant', icon:'🍋', price:189, mrp:259, tags:['floor'], vol:'5 Litre', rating:4.4, ratingCount:1203, badge:'Hot' },
  { id:'5', title:'FreshGuard HyperClean Toilet Gel', icon:'🚽', price:129, mrp:169, tags:['toilet'], vol:'750 ml', rating:4.7, ratingCount:3421, badge:'Best Seller' },
  { id:'6', title:'FreshGuard Thick Foam Toilet Cleaner', icon:'🧼', price:149, mrp:199, tags:['toilet'], vol:'1 Litre', rating:4.2, ratingCount:987, badge:'Hot' },
  { id:'7', title:'FreshGuard Ocean Fresh Toilet Gel', icon:'🌊', price:119, mrp:159, tags:['toilet'], vol:'500 ml', rating:4.5, ratingCount:654, badge:'New' },
  { id:'8', title:'FreshGuard Pro Toilet Disinfectant', icon:'⚗️', price:199, mrp:279, tags:['toilet'], vol:'1.5 Litre', rating:4.8, ratingCount:2109, badge:'Top Rated' },
  { id:'9', title:'FreshGuard ClearView Glass Spray', icon:'🪟', price:119, mrp:159, tags:['glass'], vol:'500 ml', rating:4.6, ratingCount:1876, badge:'Best Seller' },
  { id:'10', title:'FreshGuard Streak-Free Mirror Cleaner', icon:'🪞', price:139, mrp:189, tags:['glass'], vol:'750 ml', rating:4.4, ratingCount:1234, badge:'Top Rated' },
  { id:'11', title:'FreshGuard Anti-Fog Glass Protector', icon:'🔭', price:179, mrp:239, tags:['glass'], vol:'500 ml', rating:4.3, ratingCount:567, badge:'New' },
  { id:'12', title:'FreshGuard Ultra Shine Glass Liquid', icon:'✨', price:159, mrp:219, tags:['glass'], vol:'1 Litre', rating:4.5, ratingCount:2341, badge:'Hot' },
];
