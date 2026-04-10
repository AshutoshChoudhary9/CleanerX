import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
  handle: string;
  title: string;
  description: string;
  seo: {
    title: string;
    description: string;
  };
  updatedAt: string;
  path: string;
}

const CollectionSchema: Schema = new Schema({
  handle: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  seo: {
    title: String,
    description: String
  },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  path: { type: String }
}, { timestamps: true });

export default mongoose.models.Collection || mongoose.model<ICollection>('Collection', CollectionSchema);
