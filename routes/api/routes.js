import express from 'express';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
import Address from '../../models/address.js';
import { requireAuth, requireAdmin } from '../../middlewares/index.js';

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

// Cart operations
router.post('/cart/add', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    const user = await User.findById(req.user._id);
    const existingItem = user.cart.find(item => item.productId.toString() === productId);
    
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      user.cart.push({
        productId,
        quantity: parseInt(quantity),
        price: product.price
      });
    }
    
    await user.save();
    res.json({ message: 'Product added to cart', cart: user.cart });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's cart
router.get('/cart', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.productId');
    res.json(user.cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update cart item
router.put('/cart/:productId', requireAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;
    
    const user = await User.findById(req.user._id);
    const cartItem = user.cart.find(item => item.productId.toString() === productId);
    
    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    if (quantity <= 0) {
      user.cart = user.cart.filter(item => item.productId.toString() !== productId);
    } else {
      cartItem.quantity = parseInt(quantity);
    }
    
    await user.save();
    res.json({ message: 'Cart updated', cart: user.cart });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove from cart
router.delete('/cart/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter(item => item.productId.toString() !== productId);
    
    await user.save();
    res.json({ message: 'Item removed from cart', cart: user.cart });
  } catch (error) {
    console.error('Remove from cart error:', error);
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

// Process checkout with address
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { addressId, paymentMethod, bank, deliveryInstructions } = req.body;
    const user = await User.findById(req.user.id).populate('cart.productId');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    if (!user.cart || user.cart.length === 0) {
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
      userId: req.user.id, 
      isActive: true 
    });
    
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found or invalid' 
      });
    }
    
    // Calculate total
    let totalAmount = 0;
    const items = [];
    
    for (const cartItem of user.cart) {
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
    for (const cartItem of user.cart) {
      await Product.findByIdAndUpdate(
        cartItem.productId._id,
        { $inc: { stock: -cartItem.quantity } }
      );
    }
    
    // Clear cart
    user.cart = [];
    await user.save();
    
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

export default router;
