import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  transactionId: { 
    type: String, 
    unique: true, 
    required: false // Auto-generated in pre-save hook
  },
  orderNumber: {
    type: String,
    unique: true,
    required: false // Auto-generated in pre-save hook
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
  shippingFee: { type: Number, default: 60.00 },
  shippingCost: { type: Number, default: 60.00 }, // Keep for backward compatibility
  tax: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 }, // Keep for backward compatibility
  total: { type: Number, required: true },
  totalAmount: { type: Number, required: true }, // Keep for backward compatibility
  
  // Delivery information
  deliveryAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String }, // Keep for backward compatibility
    street: { type: String, required: true },
    barangay: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, default: '' },
    landmark: { type: String, default: '' },
    deliveryInstructions: { type: String, default: '' },
    type: { type: String, default: 'Home' }
  },
  
  // Payment information
  paymentMethod: {
    type: String, 
    enum: ['gcash', 'maya', 'online-banking', 'cod'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  referenceNumber: {
    type: String,
    default: null
  },
  bank: { type: String }, // For online banking
  
  // Legacy payment structure for backward compatibility
  paymentMethod_legacy: {
    method: { 
      type: String, 
      enum: ['gcash', 'maya', 'online-banking', 'cod']
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
  orderDate: { type: Date, default: Date.now },
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date },
  
  // Additional info
  deliveryInstructions: { type: String, default: '' },
  notes: { type: String, default: '' },
  invoiceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Invoice' 
  },
  
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

// Generate unique transaction ID and order number
TransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'HL' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  
  if (!this.orderNumber) {
    this.orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  
  // Set legacy fields for backward compatibility
  if (this.userId && !this.user) {
    this.user = this.userId;
  }
  
  if (this.total && !this.totalAmount) {
    this.totalAmount = this.total;
  }
  
  if (this.shippingFee && !this.shippingCost) {
    this.shippingCost = this.shippingFee;
  }
  
  if (this.tax && !this.taxAmount) {
    this.taxAmount = this.tax;
  }
  
  // Set legacy payment method structure
  if (this.paymentMethod && !this.paymentMethod_legacy) {
    this.paymentMethod_legacy = {
      method: this.paymentMethod,
      bank: this.bank,
      status: this.paymentStatus
    };
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
    orderNumber: this.orderNumber,
    totalItems: this.items.length,
    totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
    status: this.status,
    paymentStatus: this.paymentStatus,
    paymentMethod: this.paymentMethod,
    referenceNumber: this.referenceNumber,
    total: this.total || this.totalAmount,
    createdAt: this.createdAt,
    orderDate: this.orderDate,
    estimatedDelivery: this.estimatedDelivery
  };
});

// Index for better performance
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ 'paymentMethod.status': 1 });

export default mongoose.model('Transaction', TransactionSchema);
