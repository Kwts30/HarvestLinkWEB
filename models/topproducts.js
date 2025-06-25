import mongoose from "mongoose";

const topProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  salesCount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const TopProduct = mongoose.model("TopProduct", topProductSchema);

export default TopProduct;
