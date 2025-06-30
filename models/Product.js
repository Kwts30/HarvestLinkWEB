import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, default: 0 },
  unit: { type: String, required: true, default: 'piece' }, // kg, g, lb, piece, bundle, pack
  farmer: { type: String, default: '' }, // Farmer or supplier name
  image: { type: String, default: '' },
  images: [{ type: String }], // Multiple images support
  isActive: { type: Boolean, default: true },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);
