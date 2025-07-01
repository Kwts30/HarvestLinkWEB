import express from 'express';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
import Address from '../../models/address.js';
import Cart from '../../models/cart.js';
import { requireAuth, requireAdmin } from '../../middlewares/index.js';
import messagesRouter from './messages.js';

const router = express.Router();

// API health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'HarvestLink API is running',
        timestamp: new Date().toISOString(),
        host: req.get('host'),
        origin: req.get('origin') || 'none'
    });
});

// Products API
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    
    const query = {
      isActive: true,
      ...(search && { 
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }),
      ...(category && { category })
    };

    const skip = (page - 1) * limit;
    
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cart operations - Persistent Cart System
router.post('/cart/add', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;
    
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Find or create user's cart
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalAmount: 0
      });
    }
    
    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      cart.items[existingItemIndex].quantity += parseInt(quantity);
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity: parseInt(quantity),
        price: product.price
      });
    }
    
    // Calculate total amount
    cart.totalAmount = cart.items.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    
    await cart.save();
    
    // Populate product details for response
    await cart.populate('items.productId');
    
    res.json({ 
      message: 'Product added to cart', 
      cart: cart.items,
      totalAmount: cart.totalAmount,
      cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's cart
router.get('/cart', requireAuth, async (req, res) => {
  try {
    console.log('GET /cart - req.user:', req.user);
    console.log('GET /cart - req.session:', req.session);
    
    if (!req.user || !req.user._id) {
      console.log('No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = req.user._id;
    console.log('Looking for cart with userId:', userId);
    
    let cart = await Cart.findOne({ userId }).populate('items.productId');
    console.log('Found cart:', cart ? 'Yes' : 'No');
    
    if (!cart) {
      console.log('No cart found, returning empty cart');
      cart = {
        items: [],
        totalAmount: 0
      };
    }
    
    const response = {
      cart: cart.items || [],
      totalAmount: cart.totalAmount || 0,
      cartCount: cart.items ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update cart item
router.put('/cart/:productId', requireAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;
    const userId = req.user._id;
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const itemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    if (quantity <= 0) {
      // Remove item from cart
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = parseInt(quantity);
    }
    
    // Recalculate total
    cart.totalAmount = cart.items.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    
    await cart.save();
    await cart.populate('items.productId');
    
    res.json({ 
      message: 'Cart updated', 
      cart: cart.items,
      totalAmount: cart.totalAmount,
      cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove from cart
router.delete('/cart/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(item => 
      item.productId.toString() !== productId
    );
    
    // Recalculate total
    cart.totalAmount = cart.items.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    
    await cart.save();
    await cart.populate('items.productId');
    
    res.json({ 
      message: 'Item removed from cart', 
      cart: cart.items,
      totalAmount: cart.totalAmount,
      cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear entire cart
router.delete('/cart', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    await Cart.findOneAndDelete({ userId });
    
    res.json({ 
      message: 'Cart cleared',
      cart: [],
      totalAmount: 0,
      cartCount: 0
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ CHECKOUT & ADDRESS API ============

// Get addresses for checkout
router.get('/checkout/addresses', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await Address.findByUserId(userId);
    
    // Add formatted display address to each address
    const formattedAddresses = addresses.map(address => ({
      ...address.toObject(),
      displayAddress: address.fullAddress
    }));
    
    // Find primary address
    const primaryAddress = addresses.find(addr => addr.isPrimary);
    
    res.json({
      success: true,
      addresses: formattedAddresses,
      primaryAddressId: primaryAddress?._id || null
    });
  } catch (error) {
    console.error('Get checkout addresses error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch addresses' 
    });
  }
});

// Add new address for checkout
router.post('/checkout/addresses', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      type, 
      isPrimary, 
      fullName, 
      street, 
      barangay, 
      city, 
      province, 
      phone, 
      postalCode,
      landmark, 
      deliveryInstructions 
    } = req.body;
    
    // Validation - check for required fields
    const requiredFields = ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone'];
    const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].trim() === '');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Please fill in all required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }
    
    // Create new address
    const newAddress = new Address({
      userId,
      type: type.trim(),
      isPrimary: isPrimary || false,
      fullName: fullName.trim(),
      street: street.trim(),
      barangay: barangay.trim(),
      city: city.trim(),
      province: province.trim(),
      phone: phone.trim(),
      postalCode: postalCode ? postalCode.trim() : '',
      landmark: landmark ? landmark.trim() : '',
      deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : ''
    });
    
    // Save address (middleware will handle primary address logic)
    await newAddress.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Address added successfully',
      address: newAddress 
    });
  } catch (error) {
    console.error('Add checkout address error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save address. Please try again.' 
    });
  }
});

// Process checkout with address
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { addressId, paymentMethod, bank, deliveryInstructions } = req.body;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Get user's cart from Cart collection
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart is empty' 
      });
    }
    
    if (!addressId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Delivery address is required' 
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment method is required' 
      });
    }
    
    // Verify address belongs to user
    const address = await Address.findOne({ 
      _id: addressId, 
      userId: userId, 
      isActive: true 
    });
    
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found or invalid' 
      });
    }
    
    // Calculate total and prepare items
    let totalAmount = 0;
    const items = [];
    
    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      
      if (!product || !product.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: `Product "${product?.name || 'Unknown'}" is no longer available` 
        });
      }
      
      if (product.stock < cartItem.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}` 
        });
      }
      
      const itemTotal = product.price * cartItem.quantity;
      totalAmount += itemTotal;
      
      items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        total: itemTotal
      });
    }
    
    // Add shipping cost (₱60.00)
    const shippingCost = 60.00;
    totalAmount += shippingCost;
    
    // Add tax (12%)
    const taxAmount = totalAmount * 0.12;
    totalAmount += taxAmount;
    
    // Create delivery address object
    const deliveryAddress = {
      fullName: address.fullName,
      phone: address.phone,
      address: address.fullAddress,
      street: address.street,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      landmark: address.landmark,
      deliveryInstructions: deliveryInstructions || address.deliveryInstructions
    };
    
    // Create payment info object
    const paymentInfo = {
      method: paymentMethod,
      ...(bank && { bank }),
      status: paymentMethod === 'cod' ? 'pending' : 'pending_payment'
    };
    
    // Generate transaction ID
    const transactionId = `HL${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Set estimated delivery date (3-5 business days)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
    
    // Create transaction
    const transaction = new Transaction({
      transactionId,
      userId: user._id,
      items,
      totalAmount,
      subtotal: totalAmount - shippingCost - taxAmount,
      shippingCost,
      taxAmount,
      deliveryAddress,
      paymentMethod: paymentInfo,
      estimatedDelivery,
      status: 'pending',
      notes: deliveryInstructions || ''
    });
    
    await transaction.save();
    
    // Update product stock
    for (const cartItem of cart.items) {
      await Product.findByIdAndUpdate(
        cartItem.productId._id,
        { $inc: { stock: -cartItem.quantity } }
      );
    }
    
    // Clear cart from Cart collection (order completed)
    await Cart.findOneAndDelete({ userId });
    
    res.json({ 
      success: true,
      message: 'Order placed successfully', 
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        totalAmount: transaction.totalAmount,
        deliveryAddress: transaction.deliveryAddress,
        estimatedDelivery: transaction.estimatedDelivery,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status
      }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during checkout' 
    });
  }
});

// Get user orders
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.use('/messages', messagesRouter);

export default router;
