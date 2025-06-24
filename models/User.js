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
  
  // Simple address field for admin-managed users (backward compatibility)
  address: {
    street: { type: String, default: '' },
    barangay: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'Philippines' }
  },
  
  // Complex addresses array for user-managed checkout addresses
  addresses: [{
    type: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    fullName: {
      type: String,
      required: true
    },
    street: {
      type: String,
      required: true
    },
    barangay: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    province: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

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

export default mongoose.model('User', UserSchema);
