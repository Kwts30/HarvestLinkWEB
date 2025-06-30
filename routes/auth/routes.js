import express from 'express';
import User from '../../models/User.js';
import { redirectIfAuthenticated } from '../../middlewares/index.js';

const router = express.Router();

// Create a new user (signup) - redirect if already authenticated
router.post('/register', redirectIfAuthenticated, async (req, res) => {
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

// User login - redirect if already authenticated
router.post('/login', redirectIfAuthenticated, async (req, res) => {
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

// User logout
router.post('/logout', (req, res) => {
  // Cart data remains in database (persistent cart)
  // Only clear session data
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

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session.userId && req.session.user) {
    res.json({
      success: true,
      isAuthenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      success: true,
      isAuthenticated: false,
      user: null
    });
  }
});

// Forgot password (placeholder for future implementation)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }
    
    // TODO: Implement email sending functionality
    // For now, just return success message
    res.json({
      success: true,
      message: 'Password reset functionality will be implemented soon.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset password (placeholder for future implementation)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    // TODO: Implement token verification and password reset
    res.json({
      success: true,
      message: 'Password reset functionality will be implemented soon.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
