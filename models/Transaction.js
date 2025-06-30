import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  transactionId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [{
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  
  // Pricing breakdown
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 60.00 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Delivery information
  deliveryAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    street: { type: String, required: true },
    barangay: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, default: '' },
    landmark: { type: String, default: '' },
    deliveryInstructions: { type: String, default: '' }
  },
  
  // Payment information
  paymentMethod: {
    method: { 
      type: String, 
      enum: ['gcash', 'maya', 'online-banking', 'cod'], 
      required: true 
    },
    bank: { type: String }, // For online banking
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'failed', 'refunded'], 
      default: 'pending' 
    }
  },
  
  // Order status
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  
  // Dates
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date },
  
  // Additional info
  notes: { type: String, default: '' },
  
  // Legacy fields for backward compatibility
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  shippingAddress: {
    street: String,
    city: String,
    zipCode: String,
    country: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate unique transaction ID
TransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'HL' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  
  // Set legacy user field for backward compatibility
  if (this.userId && !this.user) {
    this.user = this.userId;
  }
  
  next();
});

// Virtual for formatted transaction ID
TransactionSchema.virtual('formattedId').get(function() {
  return this.transactionId;
});

// Virtual for order summary
TransactionSchema.virtual('orderSummary').get(function() {
  return {
    id: this._id,
    transactionId: this.transactionId,
    totalItems: this.items.length,
    totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
    status: this.status,
    paymentStatus: this.paymentMethod.status,
    createdAt: this.createdAt,
    estimatedDelivery: this.estimatedDelivery
  };
});

// Index for better performance
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ 'paymentMethod.status': 1 });

export default mongoose.model('Transaction', TransactionSchema);
