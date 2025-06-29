import User from '../models/User.js';

// Middleware for admin page access (redirects to login if not admin)
const requireAdminPage = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    // Get user from database to ensure they still exist and have admin role
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    if (user.role !== 'admin') {
      // User exists but is not admin
      return res.redirect('/?error=access_denied');
    }

    // Update session with latest user data
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    };

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin page authentication error:', error);
    res.redirect('/login?error=server_error');
  }
};

export default requireAdminPage;
