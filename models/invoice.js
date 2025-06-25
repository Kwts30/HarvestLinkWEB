import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["Pending", "Paid", "Cancelled"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  PaymentMethod: { type: String, enum: ["Credit Card", "Gcash", "Maya", "Bank Transfer", "COD"], default: "COD" },
  invoiceNumber: { type: String, unique: true, required: true }
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
