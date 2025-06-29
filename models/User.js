import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, default: 'user' },
  phoneNumber: { type: String, default: null }, // Phone number for user
  profileImage: { type: String, default: null }, // Profile image URL or base64 string
  
  // Migration flags
  addressesMigrated: { type: Boolean, default: false }, // Track if addresses were migrated
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for addresses (from separate Address collection)
UserSchema.virtual('addresses', {
  ref: 'Address',
  localField: '_id',
  foreignField: 'userId',
  match: { isActive: true },
  options: { sort: { isPrimary: -1, createdAt: -1 } }
});

// Virtual for primary address
UserSchema.virtual('primaryAddress', {
  ref: 'Address',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
  match: { isActive: true, isPrimary: true }
});

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user addresses
UserSchema.methods.getAddresses = function() {
  return mongoose.model('Address').findByUserId(this._id);
};

// Method to get primary address
UserSchema.methods.getPrimaryAddress = function() {
  return mongoose.model('Address').findPrimaryByUserId(this._id);
};

export default mongoose.model('User', UserSchema);
