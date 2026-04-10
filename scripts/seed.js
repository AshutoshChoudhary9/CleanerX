const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true },
  availableForSale: { type: Boolean, default: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  descriptionHtml: { type: String },
  options: [{
    id: String,
    name: String,
    values: [String]
  }],
  priceRange: {
    maxVariantPrice: { amount: String, currencyCode: String },
    minVariantPrice: { amount: String, currencyCode: String }
  },
  variants: [{
    id: String,
    title: String,
    availableForSale: Boolean,
    selectedOptions: [{ name: String, value: String }],
    price: { amount: String, currencyCode: String }
  }],
  featuredImage: {
    url: String,
    altText: String,
    width: Number,
    height: Number
  },
  images: [{
    url: String,
    altText: String,
    width: Number,
    height: Number
  }],
  seo: {
    title: String,
    description: String
  },
  tags: [String],
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

const CollectionSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  seo: {
    title: String,
    description: String
  },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  path: { type: String }
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Collection = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);

const sampleProducts = [
  {
    handle: 'crystal-clear-window-cleaner',
    title: 'Crystal Clear Window Cleaner',
    description: 'Professional grade window cleaner for a streak-free shine. Safely removes dirt, fingerprints, and grime from glass and mirrors.',
    descriptionHtml: '<p>Professional grade window cleaner for a streak-free shine. Safely removes dirt, fingerprints, and grime from glass and mirrors.</p>',
    options: [{ id: 'size', name: 'Size', values: ['500ml', '1L'] }],
    priceRange: {
      minVariantPrice: { amount: '5.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '9.99', currencyCode: 'USD' }
    },
    variants: [
      {
        id: 'variant-ccwc-500',
        title: '500ml',
        availableForSale: true,
        selectedOptions: [{ name: 'Size', value: '500ml' }],
        price: { amount: '5.99', currencyCode: 'USD' }
      },
      {
        id: 'variant-ccwc-1000',
        title: '1L',
        availableForSale: true,
        selectedOptions: [{ name: 'Size', value: '1L' }],
        price: { amount: '9.99', currencyCode: 'USD' }
      }
    ],
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=800',
      altText: 'Crystal Clear Window Cleaner Bottle',
      width: 800,
      height: 800
    },
    images: [{
      url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=800',
      altText: 'Crystal Clear Window Cleaner Bottle',
      width: 800,
      height: 800
    }],
    seo: { title: 'Crystal Clear Window Cleaner', description: 'Streak-free window cleaning solution.' },
    tags: ['window-care', 'cleaning', 'hidden-homepage-featured-items']
  },
  {
    handle: 'max-power-bathroom-cleaner',
    title: 'Max Power Bathroom Cleaner',
    description: 'Eliminates 99.9% of germs and powers through lime scale and soap scum. Leave your bathroom sparkling and fresh.',
    descriptionHtml: '<p>Eliminates 99.9% of germs and powers through lime scale and soap scum. Leave your bathroom sparkling and fresh.</p>',
    options: [{ id: 'type', name: 'Type', values: ['Spray', 'Gel'] }],
    priceRange: {
      minVariantPrice: { amount: '6.50', currencyCode: 'USD' },
      maxVariantPrice: { amount: '6.50', currencyCode: 'USD' }
    },
    variants: [
      {
        id: 'variant-mpbc-spray',
        title: 'Spray',
        availableForSale: true,
        selectedOptions: [{ name: 'Type', value: 'Spray' }],
        price: { amount: '6.50', currencyCode: 'USD' }
      }
    ],
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800',
      altText: 'Max Power Bathroom Cleaner',
      width: 800,
      height: 800
    },
    images: [{
      url: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800',
      altText: 'Max Power Bathroom Cleaner',
      width: 800,
      height: 800
    }],
    seo: { title: 'Max Power Bathroom Cleaner', description: 'Heavy duty bathroom cleaning.' },
    tags: ['bathroom-cleaners', 'disinfectant', 'hidden-homepage-featured-items']
  },
  {
    handle: 'ecogreen-all-purpose-cleaner',
    title: 'EcoGreen All-Purpose Cleaner',
    description: 'Plant-based formula that is tough on grease but gentle on the planet. Safe for use around kids and pets.',
    descriptionHtml: '<p>Plant-based formula that is tough on grease but gentle on the planet. Safe for use around kids and pets.</p>',
    options: [{ id: 'scent', name: 'Scent', values: ['Lemon', 'Lavender'] }],
    priceRange: {
      minVariantPrice: { amount: '7.25', currencyCode: 'USD' },
      maxVariantPrice: { amount: '7.25', currencyCode: 'USD' }
    },
    variants: [
      {
        id: 'variant-egap-lemon',
        title: 'Lemon',
        availableForSale: true,
        selectedOptions: [{ name: 'Scent', value: 'Lemon' }],
        price: { amount: '7.25', currencyCode: 'USD' }
      }
    ],
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1550963295-019d8a8a315e?auto=format&fit=crop&q=80&w=800',
      altText: 'EcoGreen All-Purpose Cleaner',
      width: 800,
      height: 800
    },
    images: [{
      url: 'https://images.unsplash.com/photo-1550963295-019d8a8a315e?auto=format&fit=crop&q=80&w=800',
      altText: 'EcoGreen All-Purpose Cleaner',
      width: 800,
      height: 800
    }],
    seo: { title: 'EcoGreen All-Purpose Cleaner', description: 'Sustainable multi-surface cleaner.' },
    tags: ['eco-friendly', 'kitchen', 'general', 'hidden-homepage-featured-items']
  },
  {
    handle: 'industrial-degreaser-pro',
    title: 'Industrial Degreaser Pro',
    description: 'Heavy duty degreaser for the toughest kitchen and garage messes. Concentrated formula for maximum cleaning power.',
    descriptionHtml: '<p>Heavy duty degreaser for the toughest kitchen and garage messes. Concentrated formula for maximum cleaning power.</p>',
    options: [{ id: 'size', name: 'Size', values: ['750ml'] }],
    priceRange: {
      minVariantPrice: { amount: '12.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '12.99', currencyCode: 'USD' }
    },
    variants: [
      {
        id: 'variant-idp-750',
        title: '750ml',
        availableForSale: true,
        selectedOptions: [{ name: 'Size', value: '750ml' }],
        price: { amount: '12.99', currencyCode: 'USD' }
      }
    ],
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
      altText: 'Industrial Degreaser Pro',
      width: 800,
      height: 800
    },
    images: [{
      url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
      altText: 'Industrial Degreaser Pro',
      width: 800,
      height: 800
    }],
    seo: { title: 'Industrial Degreaser Pro', description: 'Powerful grease removal.' },
    tags: ['kitchen', 'general', 'hidden-homepage-featured-items']
  },
  {
    handle: 'purefresh-disinfecting-wipes',
    title: 'PureFresh Disinfecting Wipes',
    description: 'Pack of 80 wipes that kill 99.9% of bacteria and viruses. Convenient for quick clean-ups and sanitizing surfaces.',
    descriptionHtml: '<p>Pack of 80 wipes that kill 99.9% of bacteria and viruses. Convenient for quick clean-ups and sanitizing surfaces.</p>',
    options: [{ id: 'count', name: 'Count', values: ['80 Wipes'] }],
    priceRange: {
      minVariantPrice: { amount: '4.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '4.99', currencyCode: 'USD' }
    },
    variants: [
      {
        id: 'variant-pfdw-80',
        title: '80 Wipes',
        availableForSale: true,
        selectedOptions: [{ name: 'Count', value: '80 Wipes' }],
        price: { amount: '4.99', currencyCode: 'USD' }
      }
    ],
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1584622781867-1c399f52627a?auto=format&fit=crop&q=80&w=800',
      altText: 'PureFresh Disinfecting Wipes',
      width: 800,
      height: 800
    },
    images: [{
      url: 'https://images.unsplash.com/photo-1584622781867-1c399f52627a?auto=format&fit=crop&q=80&w=800',
      altText: 'PureFresh Disinfecting Wipes',
      width: 800,
      height: 800
    }],
    seo: { title: 'PureFresh Disinfecting Wipes', description: 'Antibacterial cleaning wipes.' },
    tags: ['bathroom-cleaners', 'general', 'hidden-homepage-featured-items']
  }
];

const sampleCollections = [
  {
    handle: 'bathroom-cleaners',
    title: 'Bathroom Cleaners',
    description: 'Keep your bathroom germ-free and shiny.',
    seo: { title: 'Bathroom Cleaners', description: 'Shop our range of bathroom cleaning products.' },
    path: '/search/bathroom-cleaners'
  },
  {
    handle: 'window-care',
    title: 'Window Care',
    description: 'Everything you need for perfect glass surfaces.',
    seo: { title: 'Window Care', description: 'Specialized glass and window cleaners.' },
    path: '/search/window-care'
  },
  {
    handle: 'eco-friendly',
    title: 'Eco Friendly',
    description: 'Cleaning supplies that are good for you and the environment.',
    seo: { title: 'Eco Friendly Cleaners', description: 'Sustainable and non-toxic cleaning agents.' },
    path: '/search/eco-friendly'
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Product.deleteMany({});
    await Collection.deleteMany({});

    await Product.insertMany(sampleProducts);
    await Collection.insertMany(sampleCollections);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
