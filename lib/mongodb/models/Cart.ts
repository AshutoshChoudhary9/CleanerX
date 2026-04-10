import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  id: string; // This corresponds to the line item ID
  merchandiseId: string; // This corresponds to the Product Variant ID
  quantity: number;
}

export interface ICart extends Document {
  cartId: string;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema: Schema = new Schema({
  cartId: { type: String, required: true, unique: true },
  items: [{
    id: String,
    merchandiseId: String,
    quantity: Number
  }]
}, { timestamps: true });

export default mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema);
