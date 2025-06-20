import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Create a new user (signup)
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

// User login
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
      role: user.role
    };
      // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    // Ensure both _id and id are available for frontend compatibility
    userResponse.id = userResponse._id;
    
    res.json({ 
      success: true, 
      message: 'Login successful', 
      user: userResponse 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// User logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Could not log out' 
      });
    }
    res.clearCookie('connect.sid');
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Check authentication status
router.get('/auth-status', (req, res) => {
  if (req.session.userId) {
    res.json({ 
      success: true, 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ 
      success: true, 
      authenticated: false 
    });
  }
});

// Get all users (for testing - remove in production)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add address to user
router.post('/:userId/addresses', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, isPrimary, fullName, street, barangay, city, province, phone } = req.body;
    
    // Validate required fields
    if (!type || !fullName || !street || !barangay || !city || !province || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All address fields are required'
      });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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
router.get('/:userId/addresses', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('addresses');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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
router.put('/:userId/addresses/:addressId', async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const { type, isPrimary, fullName, street, barangay, city, province, phone } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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
router.delete('/:userId/addresses/:addressId', async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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

export default router;
