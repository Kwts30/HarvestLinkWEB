import User from '../models/User.js';

// Middleware to handle authentication failures
const failIfUnauthorized = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.status(401).json({ 
        success: false,
        error: 'User not found',
        message: 'Your session is invalid. Please log in again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: 'An error occurred while authenticating'
    });
  }
};

export default failIfUnauthorized;
