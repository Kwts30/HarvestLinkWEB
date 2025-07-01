import express from 'express';
import User from '../../models/User.js';
import { requireAuth } from '../../middlewares/index.js';
import upload from '../../middlewares/multerstorage.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Helper function to safely delete files
function deleteImageFile(imagePath) {
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), 'uploads', path.basename(imagePath));
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
  }
}

// Create a new user (signup) - backward compatibility
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, confirmPassword } = req.body;
    
    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }
    
    // Create new user
    const user = new User({ firstName, lastName, username, email, password });
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully', 
      user: userResponse 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ 
      success: false, 
      message: err.message || 'Registration failed' 
    });
  }
});

// User login - backward compatibility
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Create session
    req.session.userId = user._id;
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    };
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.id = userResponse._id;
    
    res.json({ 
      success: true, 
      message: 'Login successful', 
      user: userResponse,
      redirectUrl: user.role === 'admin' ? '/admin' : '/'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
});

// User logout - backward compatibility
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    
    res.clearCookie('connect.sid'); // Clear session cookie
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  });
});

// Check authentication status - backward compatibility
router.get('/auth-status', (req, res) => {
  if (req.session.userId && req.session.user) {
    res.json({
      success: true,
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }
});

// ============ USER PROFILE ROUTES ============

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, username, email, phone, profileImage } = req.body;
    
    // Check if username or email already exists (excluding current user)
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { email: email },
            { username: username }
          ]
        }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Prepare update data with correct field mapping
    const updateData = {
      firstName,
      lastName,
      username,
      email,
      phoneNumber: phone || null  // Map 'phone' to 'phoneNumber' for User model
    };
    
    // Handle profile image upload
    if (req.file) {
      // Delete old image file if exists
      const existingUser = await User.findById(req.user._id);
      if (existingUser?.profileImage && 
          existingUser.profileImage.startsWith('/uploads/') && 
          !existingUser.profileImage.startsWith('data:image/')) {
        deleteImageFile(existingUser.profileImage);
      }
      // Store the file path in the database
      updateData.profileImage = `/uploads/${req.file.filename}`;
    } else if (req.body.removeProfileImage === 'true') {
      // User wants to remove the image - delete existing file
      const existingUser = await User.findById(req.user._id);
      if (existingUser?.profileImage && 
          existingUser.profileImage.startsWith('/uploads/') && 
          !existingUser.profileImage.startsWith('data:image/')) {
        deleteImageFile(existingUser.profileImage);
      }
      updateData.profileImage = '';
    } else if (profileImage && profileImage.startsWith('data:image/')) {
      // Fallback: handle base64 images (for backward compatibility)
      updateData.profileImage = profileImage;
    } else if (profileImage === '') {
      // If image is empty string, remove it
      updateData.profileImage = '';
    } else if (profileImage) {
      // Keep existing image path
      updateData.profileImage = profileImage;
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, select: '-password' }
    );
    
    // Update session data
    req.session.user = {
      ...req.session.user,
      firstName,
      lastName,
      username,
      email,
      profileImage: updateData.profileImage
    };
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Add address to user
router.post('/addresses', requireAuth, async (req, res) => {
  try {
    const { type, isPrimary, fullName, street, barangay, city, province, phone } = req.body;
    
    // Validate required fields
    if (!type || !fullName || !street || !barangay || !city || !province || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All address fields are required'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // If this address is set as primary, unset other primary addresses
    if (isPrimary) {
      user.addresses.forEach(addr => {
        addr.isPrimary = false;
      });
    }
    
    // If this is the first address, set it as primary
    const isFirstAddress = user.addresses.length === 0;
    
    // Create new address
    const newAddress = {
      type,
      isPrimary: isPrimary || isFirstAddress,
      fullName,
      street,
      barangay,
      city,
      province,
      phone,
      createdAt: new Date()
    };
    
    // Add address to user
    user.addresses.push(newAddress);
    await user.save();
    
    // Get the newly added address (last one in the array)
    const addedAddress = user.addresses[user.addresses.length - 1];
    
    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      address: addedAddress
    });
  } catch (err) {
    console.error('Add address error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to add address'
    });
  }
});

// Get user addresses
router.get('/addresses', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    
    res.json({
      success: true,
      addresses: user.addresses || []
    });
  } catch (err) {
    console.error('Get addresses error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get addresses'
    });
  }
});

// Update address
router.put('/addresses/:addressId', requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const { type, isPrimary, fullName, street, barangay, city, province, phone } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Find the address to update
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    // If setting as primary, unset other primary addresses
    if (isPrimary) {
      user.addresses.forEach((addr, index) => {
        if (index !== addressIndex) {
          addr.isPrimary = false;
        }
      });
    }
    
    // Update the address
    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      type: type || user.addresses[addressIndex].type,
      isPrimary: isPrimary !== undefined ? isPrimary : user.addresses[addressIndex].isPrimary,
      fullName: fullName || user.addresses[addressIndex].fullName,
      street: street || user.addresses[addressIndex].street,
      barangay: barangay || user.addresses[addressIndex].barangay,
      city: city || user.addresses[addressIndex].city,
      province: province || user.addresses[addressIndex].province,
      phone: phone || user.addresses[addressIndex].phone
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Address updated successfully',
      address: user.addresses[addressIndex]
    });
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update address'
    });
  }
});

// Delete address
router.delete('/addresses/:addressId', requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    // Find and remove the address
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    // If we're deleting the primary address, set another address as primary
    const deletedAddress = user.addresses[addressIndex];
    user.addresses.splice(addressIndex, 1);
    
    // If the deleted address was primary and there are still addresses, set the first one as primary
    if (deletedAddress.isPrimary && user.addresses.length > 0) {
      user.addresses[0].isPrimary = true;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete address'
    });
  }
});

// Get user dashboard data
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('cart.productId');
    
    // Get user's recent orders (you'll need to implement Transaction model)
    // const recentOrders = await Transaction.find({ userId: req.user._id })
    //   .sort({ createdAt: -1 })
    //   .limit(5);
    
    res.json({
      success: true,
      user,
      cartItemsCount: user.cart?.length || 0,
      addressesCount: user.addresses?.length || 0
      // recentOrders
    });
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

export default router;
