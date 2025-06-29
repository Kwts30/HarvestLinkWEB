// Middleware to redirect authenticated users away from auth pages
const redirectTodosIfAuthenticated = (req, res, next) => {
  if (req.session.userId && req.session.user) {
    // If user is already authenticated, redirect them to appropriate page
    const user = req.session.user;
    
    // For API routes, return success with user info
    if (req.path.startsWith('/api/')) {
      return res.json({
        success: true,
        message: 'Already authenticated',
        user: user,
        redirectUrl: user.role === 'admin' ? '/admin' : '/'
      });
    } else {
      // For page routes, redirect based on user role
      const redirectUrl = user.role === 'admin' ? '/admin' : '/';
      return res.redirect(redirectUrl);
    }
  }
  
  next();
};

export default redirectTodosIfAuthenticated;
