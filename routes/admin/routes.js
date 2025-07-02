import express from 'express';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
import Address from '../../models/address.js';
import { requireAdmin } from '../../middlewares/index.js';
import upload from '../../middlewares/multerstorage.js';
import { deleteUploadedFile } from '../../middlewares/fileUtils.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    
    const totalRevenueResult = await Transaction.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Additional stats for dashboard
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: currentMonth }
    });

    const revenueThisMonthResult = await Transaction.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: currentMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const revenueThisMonth = revenueThisMonthResult[0]?.total || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const transactionsToday = await Transaction.countDocuments({
      createdAt: { $gte: today }
    });

    const productsInStock = await Product.countDocuments({ 
      stock: { $gt: 0 },
      isActive: true 
    });

    const stats = {
      totalUsers,
      totalProducts,
      totalTransactions,
      totalRevenue,
      newUsersThisMonth,
      revenueThisMonth,
      transactionsToday,
      productsInStock
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ============ USER MANAGEMENT ============

// Get all users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const query = search ? {
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user addresses from the Address collection
    const addresses = await Address.findByUserId(user._id);
    
    // Add addresses to user object
    const userWithAddresses = user.toObject();
    userWithAddresses.addresses = addresses;
    
    res.json(userWithAddresses);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/users', upload.single('profileImage'), async (req, res) => {
  try {
    const bcrypt = await import('bcrypt');
    
    // Extract and map form data to User model fields
    const userData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      role: req.body.role || 'user',
      phoneNumber: req.body.phone || req.body.phoneNumber || null
    };
    
    // Handle password
    if (req.body.password) {
      userData.password = await bcrypt.hash(req.body.password, 10);
    }

    // Handle profile image upload
    if (req.file) {
      userData.profileImage = `/uploads/${req.file.filename}`;
    } else if (req.body.removeProfileImage === 'true') {
      // User wants to remove the image
      userData.profileImage = '';
    } else if (req.body.profileImage && req.body.profileImage.startsWith('data:image/')) {
      userData.profileImage = req.body.profileImage;
    }

    const user = new User(userData);
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        errors: { [field]: `${field} already exists` }
      });
    }
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/users/:id', upload.single('profileImage'), async (req, res) => {
  try {
    // Extract and map form data to User model fields
    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      role: req.body.role,
      phoneNumber: req.body.phone || req.body.phoneNumber || null
    };
    
    // Handle password if provided
    if (req.body.password) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    // Handle profile image upload
    if (req.file) {
      console.log('Admin: New file uploaded for user:', req.params.id, req.file.filename);
      // Get existing user to delete old image if needed
      const existingUser = await User.findById(req.params.id);
      if (existingUser?.profileImage && 
          existingUser.profileImage.startsWith('/uploads/') && 
          !existingUser.profileImage.startsWith('data:image/')) {
        console.log('Admin: Deleting old profile image:', existingUser.profileImage);
        deleteUploadedFile(existingUser.profileImage, true);
      }
      updateData.profileImage = `/uploads/${req.file.filename}`;
    } else if (req.body.removeProfileImage === 'true') {
      console.log('Admin: Removing profile image for user:', req.params.id);
      // User wants to remove the image - delete existing file
      const existingUser = await User.findById(req.params.id);
      if (existingUser?.profileImage && 
          existingUser.profileImage.startsWith('/uploads/') && 
          !existingUser.profileImage.startsWith('data:image/')) {
        console.log('Admin: Deleting profile image file:', existingUser.profileImage);
        deleteUploadedFile(existingUser.profileImage, true);
      }
      updateData.profileImage = null; // Set to null instead of empty string
    } else if (req.body.profileImage && req.body.profileImage.startsWith('data:image/')) {
      updateData.profileImage = req.body.profileImage;
    } else if (req.body.profileImage === '') {
      // Delete existing file when image is set to empty
      const existingUser = await User.findById(req.params.id);
      if (existingUser?.profileImage && 
          existingUser.profileImage.startsWith('/uploads/') && 
          !existingUser.profileImage.startsWith('data:image/')) {
        console.log('Admin: Deleting profile image file (empty string):', existingUser.profileImage);
        deleteUploadedFile(existingUser.profileImage, true);
      }
      updateData.profileImage = null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update session if the updated user is the current session user
    if (req.session.userId && req.session.userId.toString() === req.params.id) {
      req.session.user = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      };
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        errors: { [field]: `${field} already exists` }
      });
    }
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ USER ADDRESS MANAGEMENT ============

// Add address to user
router.post('/users/:id/addresses', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, isPrimary, fullName, street, barangay, city, province, phone, landmark, deliveryInstructions } = req.body;
    
    // Validation
    if (!type || !fullName || !street || !barangay || !city || !province || !phone) {
      return res.status(400).json({ 
        error: 'All required address fields must be provided',
        missingFields: ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone']
      });
    }
    
    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create new address
    const newAddress = new Address({
      userId: id,
      type,
      isPrimary: isPrimary || false,
      fullName,
      street,
      barangay,
      city,
      province,
      phone,
      landmark: landmark || '',
      deliveryInstructions: deliveryInstructions || ''
    });
    
    // Save address (middleware will handle primary address logic)
    await newAddress.save();
    
    res.json({ 
      message: 'Address added successfully',
      address: newAddress 
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update address
router.put('/users/:id/addresses/:addressId', async (req, res) => {
  try {
    const { id, addressId } = req.params;
    const { type, isPrimary, fullName, street, barangay, city, province, phone, landmark, deliveryInstructions } = req.body;
    
    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find and update address
    const address = await Address.findOne({ _id: addressId, userId: id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Update address fields
    if (type) address.type = type;
    if (fullName) address.fullName = fullName;
    if (street) address.street = street;
    if (barangay) address.barangay = barangay;
    if (city) address.city = city;
    if (province) address.province = province;
    if (phone) address.phone = phone;
    if (landmark !== undefined) address.landmark = landmark;
    if (deliveryInstructions !== undefined) address.deliveryInstructions = deliveryInstructions;
    if (isPrimary !== undefined) address.isPrimary = isPrimary;
    
    await address.save();
    
    res.json({ 
      message: 'Address updated successfully',
      address: address 
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set primary address
router.put('/users/:id/addresses/:addressId/primary', async (req, res) => {
  try {
    const { id, addressId } = req.params;
    
    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find address
    const address = await Address.findOne({ _id: addressId, userId: id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Set as primary (middleware will handle unsetting others)
    await address.setPrimary();
    
    res.json({ message: 'Primary address updated successfully' });
  } catch (error) {
    console.error('Set primary address error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete address
router.delete('/users/:id/addresses/:addressId', async (req, res) => {
  try {
    const { id, addressId } = req.params;
    
    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find address
    const address = await Address.findOne({ _id: addressId, userId: id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    const wasPrimary = address.isPrimary;
    
    // Soft delete the address
    await address.softDelete();
    
    // If deleted address was primary, set another address as primary
    if (wasPrimary) {
      const remainingAddresses = await Address.findByUserId(id);
      if (remainingAddresses.length > 0) {
        await remainingAddresses[0].setPrimary();
      }
    }
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search addresses by user name or details
router.get('/addresses/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const addresses = await Address.searchAddresses(searchTerm, parseInt(limit));
    
    res.json({
      addresses,
      total: addresses.length,
      searchTerm
    });
  } catch (error) {
    console.error('Search addresses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single address by ID
router.get('/addresses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const address = await Address.findById(id).populate('userId', 'firstName lastName email');
    
    if (!address || !address.isActive) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    res.json({
      success: true,
      address
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PRODUCT MANAGEMENT ============

// Get all products
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const isActive = req.query.isActive || '';
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    // Get product stats
    const stats = {
      active: await Product.countDocuments({ isActive: true }),
      lowStock: await Product.countDocuments({ stock: { $lte: 10, $gt: 0 }, isActive: true }),
      outOfStock: await Product.countDocuments({ stock: 0, isActive: true })
    };

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      stats
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get top products
router.get('/products/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // For now, return products sorted by stock (as a proxy for sales)
    const topProducts = await Product.find({ isActive: true })
      .sort({ stock: -1 })
      .limit(limit)
      .lean(); // Use lean for better performance

    res.json(topProducts || []);
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create product
router.post('/products', upload.single('productImage'), async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // Handle image upload if present
    if (req.file) {
      // Store the file path in the database
      productData.image = `/uploads/${req.file.filename}`;
    } else if (req.body.removeProductImage === 'true') {
      // User wants to remove the image
      productData.image = '';
    } else if (req.body.image && req.body.image.startsWith('data:image/')) {
      // Fallback: handle base64 images (for backward compatibility)
      productData.image = req.body.image;
    }
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/products/:id', upload.single('productImage'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Get the existing product to check for old image
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Handle image upload if present
    if (req.file) {
      // Delete old image file if it exists and is not a base64 image
      if (existingProduct.image && 
          existingProduct.image.startsWith('/uploads/') && 
          !existingProduct.image.startsWith('data:image/')) {
        deleteUploadedFile(existingProduct.image, true);
      }
      
      // Store the new file path in the database
      updateData.image = `/uploads/${req.file.filename}`;
    } else if (req.body.removeProductImage === 'true') {
      // User wants to remove the image - delete existing file
      if (existingProduct.image && 
          existingProduct.image.startsWith('/uploads/') && 
          !existingProduct.image.startsWith('data:image/')) {
        deleteUploadedFile(existingProduct.image, true);
      }
      updateData.image = '';
    } else if (req.body.image && req.body.image.startsWith('data:image/')) {
      // Fallback: handle base64 images (for backward compatibility)
      updateData.image = req.body.image;
    } else if (req.body.image === '') {
      // If image is empty string, remove it and delete old file
      if (existingProduct.image && 
          existingProduct.image.startsWith('/uploads/') && 
          !existingProduct.image.startsWith('data:image/')) {
        deleteUploadedFile(existingProduct.image, true);
      }
      updateData.image = '';
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete associated image file if it exists
    if (product.image && 
        product.image.startsWith('/uploads/') && 
        !product.image.startsWith('data:image/')) {
      deleteUploadedFile(product.image, true);
    }
    
    // Delete the product from database
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ TRANSACTION MANAGEMENT ============

// Get all transactions
router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const transactions = await Transaction.find(query)
      .populate({
        path: 'user',
        select: 'firstName lastName username email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'userId',
        select: 'firstName lastName username email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'items.productId',
        select: 'name',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Use lean for better performance

    const total = await Transaction.countDocuments(query);

    // Get transaction stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRevenue = await Transaction.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: today }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const stats = {
      delivered: await Transaction.countDocuments({ status: 'delivered' }),
      pending: await Transaction.countDocuments({ status: 'pending' }),
      cancelled: await Transaction.countDocuments({ status: 'cancelled' }),
      todayRevenue: todayRevenue[0]?.total || 0
    };

    res.json({
      transactions: transactions || [],
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      stats
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update transaction status
router.put('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('user', 'firstName lastName username email');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export transactions
router.get('/transactions/export', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({
        path: 'user',
        select: 'firstName lastName email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'userId',
        select: 'firstName lastName email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'items.productId',
        select: 'name',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });

    // Create CSV content
    const csvHeader = 'Transaction ID,Customer Name,Email,Amount,Status,Date,Items\n';
    const csvRows = transactions.map(transaction => {
      // Handle both user and userId fields for backward compatibility
      const user = transaction.user || transaction.userId;
      const customerName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Customer';
      const email = user ? user.email : 'Unknown Email';
      
      // Handle productId field
      const items = transaction.items.map(item => {
        const productName = item.productId?.name || item.name || 'Unknown Product';
        return `${productName} (x${item.quantity})`;
      }).join('; ');
      
      const date = transaction.createdAt.toISOString().split('T')[0];
      
      return `${transaction.transactionId},"${customerName}","${email}",${transaction.totalAmount},"${transaction.status}","${date}","${items}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ANALYTICS ============

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const range = parseInt(req.query.range) || 30; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    // Average order value
    const avgOrderResult = await Transaction.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
    ]);
    const avgOrderValue = avgOrderResult[0]?.avg || 0;

    // Customer retention (simplified - returning customers)
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const returningCustomers = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'returning' }
    ]);
    const customerRetention = totalCustomers > 0 ? 
      ((returningCustomers[0]?.returning || 0) / totalCustomers) * 100 : 0;

    // Most popular product
    const popularProductResult = await Transaction.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' }
    ]);
    const popularProduct = popularProductResult[0]?.product.name || 'N/A';

    // Peak hours (simplified)
    const peakHours = '10:00 AM - 2:00 PM';

    res.json({
      avgOrderValue,
      customerRetention,
      popularProduct,
      peakHours
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sales chart data
router.get('/charts/sales', async (req, res) => {
  try {
    const period = parseInt(req.query.period) || 7; // days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const salesData = await Transaction.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          sales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json(salesData);
  } catch (error) {
    console.error('Sales chart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
