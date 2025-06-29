import express from 'express';
import Address from '../../models/address.js';
import User from '../../models/User.js';
import { requireAuth } from '../../middlewares/index.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// ============ USER ADDRESS MANAGEMENT ============

// Get all addresses for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await Address.findByUserId(userId);
    
    // Find primary address
    const primaryAddress = addresses.find(addr => addr.isPrimary);
    
    res.json({
      success: true,
      addresses,
      primaryAddressId: primaryAddress?._id || null
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch addresses' 
    });
  }
});

// Get primary address for current user
router.get('/primary', async (req, res) => {
  try {
    const userId = req.user.id;
    const primaryAddress = await Address.findPrimaryByUserId(userId);
    
    if (!primaryAddress) {
      return res.json({
        success: true,
        address: null,
        message: 'No primary address found'
      });
    }
    
    res.json({
      success: true,
      address: primaryAddress
    });
  } catch (error) {
    console.error('Get primary address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch primary address' 
    });
  }
});

// Add new address for current user
router.post('/', async (req, res) => {
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
    
    // Validation
    if (!type || !fullName || !street || !barangay || !city || !province || !phone) {
      return res.status(400).json({ 
        success: false,
        error: 'All required address fields must be provided',
        missingFields: ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone']
      });
    }
    
    // Create new address
    const newAddress = new Address({
      userId,
      type,
      isPrimary: isPrimary || false,
      fullName,
      street,
      barangay,
      city,
      province,
      phone,
      postalCode: postalCode || '',
      landmark: landmark || '',
      deliveryInstructions: deliveryInstructions || ''
    });
    
    // Save address (middleware will handle primary address logic)
    await newAddress.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Address added successfully',
      address: newAddress 
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

// Update existing address
router.put('/:addressId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
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
    
    // Find and verify ownership of address
    const address = await Address.findOne({ _id: addressId, userId, isActive: true });
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found' 
      });
    }
    
    // Update address fields
    if (type) address.type = type;
    if (fullName) address.fullName = fullName;
    if (street) address.street = street;
    if (barangay) address.barangay = barangay;
    if (city) address.city = city;
    if (province) address.province = province;
    if (phone) address.phone = phone;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (landmark !== undefined) address.landmark = landmark;
    if (deliveryInstructions !== undefined) address.deliveryInstructions = deliveryInstructions;
    if (isPrimary !== undefined) address.isPrimary = isPrimary;
    
    await address.save();
    
    res.json({ 
      success: true,
      message: 'Address updated successfully',
      address: address 
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

// Set address as primary
router.put('/:addressId/primary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
    
    // Find and verify ownership of address
    const address = await Address.findOne({ _id: addressId, userId, isActive: true });
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found' 
      });
    }
    
    // Set as primary (method will handle unsetting others)
    await address.setPrimary();
    
    res.json({ 
      success: true,
      message: 'Primary address updated successfully' 
    });
  } catch (error) {
    console.error('Set primary address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

// Delete address (soft delete)
router.delete('/:addressId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
    
    // Find and verify ownership of address
    const address = await Address.findOne({ _id: addressId, userId, isActive: true });
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found' 
      });
    }
    
    const wasPrimary = address.isPrimary;
    
    // Soft delete the address
    await address.softDelete();
    
    // If deleted address was primary, set another address as primary
    if (wasPrimary) {
      const remainingAddresses = await Address.findByUserId(userId);
      if (remainingAddresses.length > 0) {
        await remainingAddresses[0].setPrimary();
      }
    }
    
    res.json({ 
      success: true,
      message: 'Address deleted successfully' 
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

// Get specific address
router.get('/:addressId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
    
    // Find and verify ownership of address
    const address = await Address.findOne({ _id: addressId, userId, isActive: true });
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found' 
      });
    }
    
    res.json({
      success: true,
      address
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

export default router;
