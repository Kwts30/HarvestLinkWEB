// Middleware to redirect unauthenticated users to login page
const redirectIfNotAuthenticated = (req, res, next) => {
  // For API routes, return JSON error
  if (req.path.startsWith('/api/')) {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to continue',
        redirectUrl: '/login'
      });
    }
  } else {
    // For page routes, redirect to login
    if (!req.session.userId) {
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
  }
  
  next();
};

export default redirectIfNotAuthenticated;
