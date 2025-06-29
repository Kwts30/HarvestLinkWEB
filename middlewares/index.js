import User from '../models/User.js';
import failIfUnauthorized from './failIfUnauthorized.js';
import redirectIfNotAuthenticated from './redirectIfNotAuthenticated.js';
import redirectTodosIfAuthenticated from './redirectIfAuthenticated.js';
import requireAdminPage from './requireAdminPage.js';

// Enhanced authentication middleware with user loading
const requireAuth = async (req, res, next) => {
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

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
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

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: 'An error occurred while authenticating'
    });
  }
};

// Optional authentication middleware (doesn't fail if not authenticated)
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Don't fail the request, just continue without user
    next();
  }
};

// Role-based access control middleware
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
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
        req.session.destroy();
        return res.status(401).json({ 
          success: false,
          error: 'User not found',
          message: 'Your session is invalid. Please log in again.'
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          success: false,
          error: 'Access denied',
          message: `Access restricted to: ${allowedRoles.join(', ')}`
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Role-based authentication error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Server error',
        message: 'An error occurred while authenticating'
      });
    }
  };
};

// Session validation middleware
const validateSession = (req, res, next) => {
  // Check if session exists and is valid
  if (req.session && req.session.userId) {
    // Extend session expiry on each request
    req.session.touch();
  }
  next();
};

// Rate limiting middleware (basic implementation)
const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(clientId)) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const clientData = requests.get(clientId);
    
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }
    
    clientData.count++;
    next();
  };
};

// Export all middlewares
export {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireRole,
  validateSession,
  rateLimit,
  failIfUnauthorized,
  redirectIfNotAuthenticated,
  redirectTodosIfAuthenticated,
  requireAdminPage
};

// Default export for backward compatibility
export default {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireRole,
  validateSession,
  rateLimit,
  failIfUnauthorized,
  redirectIfNotAuthenticated,
  redirectTodosIfAuthenticated,
  requireAdminPage
};
