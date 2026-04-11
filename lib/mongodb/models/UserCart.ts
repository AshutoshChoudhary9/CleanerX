import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserCartItem {
  productId: string;
  quantity: number;
}

export interface IUserCart extends Document {
  userId: Types.ObjectId;
  products: IUserCartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const UserCartSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 }
      }
    ]
  },
  { timestamps: true, collection: 'carts' }
);

export default mongoose.models.UserCart || mongoose.model<IUserCart>('UserCart', UserCartSchema);
