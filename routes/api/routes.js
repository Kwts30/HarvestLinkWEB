import express from 'express';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
import Address from '../../models/address.js';
import Cart from '../../models/cart.js';
import Invoice from '../../models/invoice.js';
import TopProduct from '../../models/topproducts.js';
import { requireAuth, requireAdmin } from '../../middlewares/index.js';
import { validatePaymentReferenceMiddleware } from '../../middlewares/paymentValidation.js';
import messagesRouter from './messages.js';

const router = express.Router();

// Mount messages router
router.use('/messages', messagesRouter);

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

// ================================
// CHECKOUT API ENDPOINTS
// ================================

// Get user addresses for checkout
router.get('/checkout/addresses', requireAuth, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ isPrimary: -1, createdAt: -1 });
    const primaryAddress = addresses.find(addr => addr.isPrimary);
    
    const formattedAddresses = addresses.map(address => ({
      ...address.toObject(),
      displayAddress: `${address.street}, ${address.barangay}, ${address.city}, ${address.province}`
    }));

    res.json({
      success: true,
      addresses: formattedAddresses,
      primaryAddressId: primaryAddress?._id || null
    });
  } catch (error) {
    console.error('Get checkout addresses error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load addresses',
      details: error.message 
    });
  }
});

// Add new address
router.post('/checkout/addresses', requireAuth, async (req, res) => {
  try {
    const { type, fullName, phone, street, barangay, city, province, postalCode, landmark, deliveryInstructions, isPrimary } = req.body;

    // Validate required fields
    if (!fullName || !phone || !street || !barangay || !city || !province) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // If this is set as primary, unset others
    if (isPrimary) {
      await Address.updateMany(
        { userId: req.user._id },
        { $set: { isPrimary: false } }
      );
    }

    const address = new Address({
      userId: req.user._id,
      type: type || 'Home',
      fullName,
      phone,
      street,
      barangay,
      city,
      province,
      postalCode: postalCode || '',
      landmark: landmark || '',
      deliveryInstructions: deliveryInstructions || '',
      isPrimary: isPrimary || false
    });

    await address.save();

    res.json({
      success: true,
      address: address.toObject(),
      message: 'Address saved successfully'
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save address',
      details: error.message 
    });
  }
});

// Place order endpoint
// Place order endpoint with payment validation
router.post('/checkout/place-order', requireAuth, validatePaymentReferenceMiddleware, async (req, res) => {
  try {
    const { 
      addressId, 
      paymentMethod, 
      referenceNumber, 
      items, 
      subtotal, 
      shippingFee, 
      tax, 
      total,
      deliveryInstructions 
    } = req.body;

    // Debug logging
    console.log('Order request - User:', req.user ? { id: req.user._id, firstName: req.user.firstName, lastName: req.user.lastName } : 'No user');
    console.log('Order request - Address ID:', addressId);
    console.log('Order request - Payment Method:', paymentMethod);
    console.log('Order request - Items:', items?.length || 0);

    // Validate required fields
    if (!addressId || !paymentMethod || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order information'
      });
    }

    // Use validated reference number from middleware
    const validatedReference = req.validatedReference;

    // Get user address
    const address = await Address.findOne({ _id: addressId, userId: req.user._id });
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery address'
      });
    }

    // Validate products and calculate totals
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      const itemTotal = product.price * item.quantity;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }

    // Validate calculated totals
    const calculatedTax = calculatedSubtotal * 0.12;
    const calculatedTotal = calculatedSubtotal + shippingFee + calculatedTax;

    if (Math.abs(calculatedTotal - total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Order total mismatch'
      });
    }

    // Create transaction (transactionId and orderNumber will be auto-generated)
    const transaction = new Transaction({
      userId: req.user._id,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      shippingFee,
      tax: calculatedTax,
      total: calculatedTotal,
      totalAmount: calculatedTotal, // For backward compatibility
      paymentMethod,
      paymentStatus: 'pending', // All payments start as pending until admin approval
      referenceNumber: referenceNumber || null,
      deliveryAddress: {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        barangay: address.barangay,
        city: address.city,
        province: address.province,
        type: address.type
      },
      deliveryInstructions: deliveryInstructions || '',
      status: 'pending',
      orderDate: new Date()
    });

    await transaction.save();

    // Update product stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity, sold: item.quantity } }
      );
    }

    // Clear user's cart
    await Cart.deleteMany({ userId: req.user._id });

    // Generate invoice number (e.g., INV-YYYYMMDD-<random/unique>)
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const uniquePart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const invoiceNumber = `INV-${dateStr}-${uniquePart}`;

    // Validate invoice number generation
    if (!invoiceNumber || invoiceNumber.length < 10) {
      throw new Error('Failed to generate invoice number');
    }

    console.log('Generated invoice number:', invoiceNumber);

    // Get customer name from address or user
    let customerName = '';
    if (address && address.fullName && address.fullName.trim()) {
      customerName = address.fullName.trim();
    } else if (req.user && req.user.firstName && req.user.firstName.trim()) {
      customerName = req.user.firstName.trim() + (req.user.lastName ? ' ' + req.user.lastName.trim() : '');
    } else if (req.user && req.user.username && req.user.username.trim()) {
      customerName = req.user.username.trim();
    } else {
      customerName = 'Customer';
    }

    // Ensure customer name is not empty
    if (!customerName || customerName.trim() === '') {
      customerName = 'Customer';
    }

    // Debug logging for customer name
    console.log('Customer name resolved to:', customerName);
    console.log('Address fullName:', address?.fullName);
    console.log('User firstName:', req.user?.firstName);
    console.log('User lastName:', req.user?.lastName);

    // Ensure all required fields are present
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      throw new Error('Invoice number is required');
    }
    if (!customerName || customerName.trim() === '') {
      throw new Error('Customer name is required');
    }
    if (!calculatedTotal || calculatedTotal <= 0) {
      throw new Error('Total amount is required and must be greater than 0');
    }

    // Map payment method for invoice (Invoice model uses different enum values)
    const mapPaymentMethodForInvoice = (method) => {
      const methodMap = {
        'gcash': 'Gcash',
        'maya': 'Maya',
        'cod': 'COD',
        'online-banking': 'Bank Transfer',
        'bank-transfer': 'Bank Transfer',
        'credit-card': 'Credit Card'
      };
      return methodMap[method.toLowerCase()] || 'COD';
    };

    const invoice = new Invoice({
      invoiceNumber,
      customerName,
      items: validatedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: calculatedTotal,
      status: 'Pending', // All invoices start as pending until payment is verified
      PaymentMethod: mapPaymentMethodForInvoice(paymentMethod),
      createdAt: new Date()
    });

    try {
      await invoice.save();
    } catch (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      // If invoice creation fails, we should still complete the order
      // but log the error for debugging
      console.log('Invoice data that failed:', {
        invoiceNumber,
        customerName,
        totalAmount: calculatedTotal,
        itemsCount: validatedItems.length
      });
    }

    res.json({
      success: true,
      message: 'Order placed successfully',
      order: {
        _id: transaction._id,
        orderNumber: transaction.orderNumber,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        paymentStatus: transaction.paymentStatus,
        referenceNumber: transaction.referenceNumber,
        status: transaction.status
      }
    });

  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to place order',
      details: error.message 
    });
  }
});

// Admin endpoint to approve payment
router.put('/admin/transactions/:transactionId/approve-payment', requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { approved } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Update payment status
    transaction.paymentStatus = approved ? 'paid' : 'failed';
    
    // If payment is approved, also update the order status to confirmed
    if (approved) {
      transaction.status = 'confirmed';
    }

    await transaction.save();

    // Also update the invoice status if it exists
    const invoice = await Invoice.findOne({ 
      items: { $elemMatch: { productId: { $in: transaction.items.map(item => item.productId) } } },
      totalAmount: transaction.total,
      createdAt: { $gte: new Date(transaction.orderDate.getTime() - 60000) } // Within 1 minute of order
    });

    if (invoice) {
      invoice.status = approved ? 'Paid' : 'Cancelled';
      await invoice.save();
    }

    res.json({
      success: true,
      message: `Payment ${approved ? 'approved' : 'rejected'} successfully`,
      transaction: {
        _id: transaction._id,
        paymentStatus: transaction.paymentStatus,
        status: transaction.status
      }
    });

  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve payment',
      details: error.message
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

// ============ TRANSACTION RECEIPT API ============

// Get transaction receipt
router.get('/transactions/:transactionId/receipt', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    // Populate user with username and email
    const transaction = await Transaction.findOne({
      transactionId: transactionId,
      userId: userId
    })
      .populate('items.productId', 'name')
      .populate('invoiceId')
      .populate({
        path: 'userId',
        select: 'username email'
      })
      .exec();

    // Debug log to check what is returned for userId
    console.log('DEBUG: transaction.userId =', transaction ? transaction.userId : 'No transaction');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction: transaction,
      invoice: transaction.invoiceId || null
    });
  } catch (error) {
    console.error('Get transaction receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction receipt'
    });
  }
});

// Get top products based on sales data
router.get('/products/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get top products based on actual sales data
    const topProducts = await TopProduct.find()
      .populate({
        path: 'productId',
        match: { isActive: true }, // Only include active products
        select: 'name description price image category stock isActive'
      })
      .sort({ salesCount: -1 })
      .limit(limit)
      .lean();
    
    // Filter out any products that were not populated (inactive products)
    const validTopProducts = topProducts
      .filter(item => item.productId)
      .map(item => ({
        ...item.productId,
        salesCount: item.salesCount,
        _id: item.productId._id
      }));
    
    // If we don't have enough top products from sales data, fill with newest active products
    if (validTopProducts.length < limit) {
      const existingProductIds = validTopProducts.map(p => p._id.toString());
      const additionalProducts = await Product.find({ 
        isActive: true,
        _id: { $nin: existingProductIds }
      })
      .sort({ createdAt: -1 })
      .limit(limit - validTopProducts.length)
      .lean();
      
      // Add salesCount: 0 to additional products
      const additionalWithSalesCount = additionalProducts.map(product => ({
        ...product,
        salesCount: 0
      }));
      
      validTopProducts.push(...additionalWithSalesCount);
    }

    res.json({
      success: true,
      products: validTopProducts,
      message: 'Top products retrieved successfully'
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      details: error.message 
    });
  }
});

export default router;
