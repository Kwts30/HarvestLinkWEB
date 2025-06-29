import express from 'express';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
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

// Checkout
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { shippingInfo, paymentMethod } = req.body;
    
    const user = await User.findById(req.user._id).populate('cart.productId');
    
    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Calculate total
    let totalAmount = 0;
    const items = [];
    
    for (const cartItem of user.cart) {
      const product = cartItem.productId;
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${product?.name || 'unknown'} is no longer available` });
      }
      
      if (product.stock < cartItem.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
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
    
    // Create transaction
    const transaction = new Transaction({
      userId: user._id,
      items,
      totalAmount,
      shippingInfo,
      paymentMethod,
      status: 'pending'
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
      message: 'Order placed successfully', 
      transaction: transaction._id,
      totalAmount 
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Server error' });
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
