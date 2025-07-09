import express from 'express';
import User from '../../models/User.js';
import { requireAuth } from '../../middlewares/index.js';
import { processPasswordChange } from '../../middlewares/verifyPassword.js';
import upload from '../../middlewares/multerstorage.js';
import { deleteUploadedFile } from '../../middlewares/fileUtils.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Helper function to safely delete files (enhanced version)
function deleteImageFile(imagePath) {
  console.log('Attempting to delete image file:', imagePath);
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), 'uploads', path.basename(imagePath));
    console.log('Full path to delete:', fullPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath); // Use synchronous deletion for immediate cleanup
        console.log('Successfully deleted file:', fullPath);
        return true;
      } catch (err) {
        console.error('Error deleting file:', err);
        return false;
      }
    } else {
      console.log('File does not exist:', fullPath);
      return false;
    }
  } else {
    console.log('Invalid image path, not deleting:', imagePath);
    return false;
  }
}

// Helper function to safely delete files (async version for non-blocking operations)
function deleteImageFileAsync(imagePath) {
  console.log('Attempting to delete image file (async):', imagePath);
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), 'uploads', path.basename(imagePath));
    console.log('Full path to delete:', fullPath);
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('Successfully deleted file:', fullPath);
        }
      });
    } else {
      console.log('File does not exist:', fullPath);
    }
  } else {
    console.log('Invalid image path, not deleting:', imagePath);
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
    const { username, password } = req.body;
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
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
router.put('/profile', requireAuth, upload.single('profileImage'), processPasswordChange, async (req, res) => {
  try {
    const { firstName, lastName, username, email, phone, profileImage, removeProfileImage } = req.body;
    
    console.log('Profile update request:', {
      userId: req.user._id,
      removeProfileImage,
      hasFile: !!req.file,
      profileImageField: profileImage
    });
    
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

    // Get current user data for file deletion
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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

    // Handle password change if processed by middleware
    if (req.body.password) {
      updateData.password = req.body.password;
    }

    // Handle profile image operations
    if (req.file) {
      console.log('New file uploaded:', req.file.filename);
      // Delete old image file if exists
      if (currentUser?.profileImage && 
          currentUser.profileImage.startsWith('/uploads/') && 
          !currentUser.profileImage.startsWith('data:image/')) {
        console.log('Deleting old profile image:', currentUser.profileImage);
        deleteUploadedFile(currentUser.profileImage, true);
      }
      // Store the new file path in the database
      updateData.profileImage = `/uploads/${req.file.filename}`;
    } else if (removeProfileImage === 'true') {
      console.log('Removing profile image for user:', req.user._id);
      // User wants to remove the image - delete existing file
      if (currentUser?.profileImage && 
          currentUser.profileImage.startsWith('/uploads/') && 
          !currentUser.profileImage.startsWith('data:image/')) {
        console.log('Deleting profile image file:', currentUser.profileImage);
        deleteUploadedFile(currentUser.profileImage, true);
      }
      updateData.profileImage = null; // Set to null instead of empty string
    } else if (profileImage && profileImage.startsWith('data:image/')) {
      // Fallback: handle base64 images (for backward compatibility)
      updateData.profileImage = profileImage;
    }
    // Note: If no new file, no removal flag, and no base64 image, we preserve the existing image
    // This prevents accidental deletion when editing profile without changing the image
    // If no profile image changes are specified, don't modify the profileImage field
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User updated successfully:', {
      userId: updatedUser._id,
      profileImage: updatedUser.profileImage
    });

    // Update session data
    req.session.user = {
      ...req.session.user,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      username: updatedUser.username,
      email: updatedUser.email,
      profileImage: updatedUser.profileImage
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
