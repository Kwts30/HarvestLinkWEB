import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [{
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'cancelled', 'refunded'], 
    default: 'completed' 
  },
  paymentMethod: { type: String, default: 'cash_on_delivery' },
  shippingAddress: {
    street: String,
    city: String,
    zipCode: String,
    country: String
  },
  transactionId: { type: String, unique: true, required: true }
}, { timestamps: true });

// Generate unique transaction ID
TransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

export default mongoose.model('Transaction', TransactionSchema);
