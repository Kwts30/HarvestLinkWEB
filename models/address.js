import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true // Index for faster queries by userId
  },
  
  // Address Type and Priority
  type: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  
  // Contact Information
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Address Details
  street: { 
    type: String, 
    required: true,
    trim: true
  },
  barangay: { 
    type: String, 
    required: true,
    trim: true
  },
  city: { 
    type: String, 
    required: true,
    trim: true
  },
  province: { 
    type: String, 
    required: true,
    trim: true
  },
  postalCode: { 
    type: String, 
    default: '',
    trim: true
  },
  country: { 
    type: String, 
    default: 'Philippines',
    trim: true
  },
  
  // Additional Information
  landmark: {
    type: String,
    default: '',
    trim: true
  },
  deliveryInstructions: {
    type: String,
    default: '',
    trim: true
  },
  
  // Status and Validation
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // This will automatically handle createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtual properties in JSON output
  toObject: { virtuals: true } // Include virtual properties in object output
});

// Indexes for better performance
addressSchema.index({ userId: 1, isPrimary: 1 });
addressSchema.index({ userId: 1, type: 1 });
addressSchema.index({ fullName: 'text', street: 'text', city: 'text' }); // For text search

// Virtual for display address (used in checkout)
addressSchema.virtual('displayAddress').get(function() {
  return this.fullAddress;
});

// Virtual for full address
addressSchema.virtual('fullAddress').get(function() {
  const parts = [this.street, this.barangay, this.city, this.province];
  return parts.filter(part => part && part.trim()).join(', ');
});

// Virtual for formatted address with name
addressSchema.virtual('formattedAddress').get(function() {
  return `${this.fullName}\n${this.fullAddress}\n${this.phone}`;
});

// Middleware to ensure only one primary address per user
addressSchema.pre('save', async function(next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    // If this address is being set as primary, unset all other primary addresses for this user
    await this.constructor.updateMany(
      { 
        userId: this.userId, 
        _id: { $ne: this._id },
        isPrimary: true 
      },
      { $set: { isPrimary: false } }
    );
  }
  
  // If this is the first address for the user, make it primary
  if (this.isNew) {
    const addressCount = await this.constructor.countDocuments({ userId: this.userId });
    if (addressCount === 0) {
      this.isPrimary = true;
    }
  }
  
  next();
});

// Static method to find addresses by user ID
addressSchema.statics.findByUserId = function(userId) {
  return this.find({ userId, isActive: true }).sort({ isPrimary: -1, createdAt: -1 });
};

// Static method to find primary address for user
addressSchema.statics.findPrimaryByUserId = function(userId) {
  return this.findOne({ userId, isPrimary: true, isActive: true });
};

// Static method to search addresses by name or details
addressSchema.statics.searchAddresses = function(searchTerm, limit = 10) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { fullName: { $regex: searchTerm, $options: 'i' } },
          { street: { $regex: searchTerm, $options: 'i' } },
          { city: { $regex: searchTerm, $options: 'i' } },
          { province: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  })
  .populate('userId', 'firstName lastName email')
  .sort({ updatedAt: -1 })
  .limit(limit);
};

// Instance method to set as primary
addressSchema.methods.setPrimary = async function() {
  // Unset all other primary addresses for this user
  await this.constructor.updateMany(
    { 
      userId: this.userId, 
      _id: { $ne: this._id },
      isPrimary: true 
    },
    { $set: { isPrimary: false } }
  );
  
  // Set this address as primary
  this.isPrimary = true;
  return this.save();
};

// Instance method to soft delete
addressSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

export default mongoose.model('Address', addressSchema);