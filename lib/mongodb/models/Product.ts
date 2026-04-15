import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  handle: string;
  availableForSale: boolean;
  title: string;
  description: string;
  descriptionHtml: string;
  options: {
    id: string;
    name: string;
    values: string[];
  }[];
  priceRange: {
    maxVariantPrice: { amount: string; currencyCode: string };
    minVariantPrice: { amount: string; currencyCode: string };
  };
  variants: {
    id: string;
    title: string;
    availableForSale: boolean;
    selectedOptions: { name: string; value: string }[];
    price: { amount: string; currencyCode: string };
  }[];
  featuredImage: {
    url: string;
    altText: string;
    width: number;
    height: number;
  };
  images: {
    url: string;
    altText: string;
    width: number;
    height: number;
  }[];
  seo: {
    title: string;
    description: string;
  };
  tags: string[];
  updatedAt: string;
}

const ProductSchema: Schema = new Schema({
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
  metadata: {
    bundleItems: [String],
    bulkQty: Number,
    subDiscount: Number
  }
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
