import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import connect from './server/database/mongodb-connect.js';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connect();

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow specific live preview URLs
    const allowedOrigins = [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any domain for live preview/deployment
    // In production, you might want to restrict this to specific domains
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'harvestlink-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Custom middleware to block HTML files and serve other static files
app.use((req, res, next) => {
    // Block direct access to HTML files but allow CSS and JS files
    if (req.path.endsWith('.html')) {
        return res.status(404).send('HTML files are not accessible. Please use the proper routes.');
    }
    next();
});

// Static files middleware for assets only
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/backup_html', express.static(path.join(__dirname, 'backup_html')));
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'script.js')));

// Serve CSS and JS files from view subdirectories
app.use('/views', express.static(path.join(__dirname, 'views')));

app.use(express.static(path.join(__dirname), {
    index: false, // Disable directory indexing
    dotfiles: 'deny' // Deny access to dotfiles
}));

// Middleware to add base URL and universal helpers to all views
app.use((req, res, next) => {
    // Get the protocol and host
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    // Add helper functions to all views
    res.locals.baseUrl = baseUrl;
    res.locals.url = (path) => {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
    };
    res.locals.isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    res.locals.currentUrl = `${baseUrl}${req.originalUrl}`;
    
    next();
});

// Import routes and models
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import User from './models/User.js';

// Routes
// API health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'HarvestLink API is running',
        timestamp: new Date().toISOString(),
        host: req.get('host'),
        origin: req.get('origin') || 'none'
    });
});

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files
app.get('/', (req, res) => {
    res.render('home', { 
        title: 'HarvestLink - Fresh Goods for You',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/signup', (req, res) => {
    res.render('Signup/signup', { 
        title: 'HarvestLink - Sign Up',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/login', (req, res) => {
    res.render('Login/login', { 
        title: 'HarvestLink - Login',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/cart', (req, res) => {
    res.render('Cart/cart', { 
        title: 'HarvestLink - Shopping Cart',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/checkout', (req, res) => {
    res.render('Checkout/checkout', { 
        title: 'HarvestLink - Checkout',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/admin', (req, res) => {
    // Check if user is admin
    if (!req.session.userId || !req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login');
    }
    res.render('Admin/admin', { 
        title: 'HarvestLink - Admin Dashboard',
        user: req.session.user,
        isAuthenticated: true
    });
});

app.get('/shop', (req, res) => {
    res.render('Shop/shop', { 
        title: 'HarvestLink - Shop',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/contacts', (req, res) => {
    res.render('Contacts/contacts', { 
        title: 'HarvestLink - Contact',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/profile', (req, res) => {
    // Example data, replace with real user/session logic as needed
    const user = {
        profilePicture: '/assets/homepage/jaryl.jpg',
        fullName: 'Juan Dela Cruz',
        email: 'juan@example.com',
        phone: '0917-123-4567',
        address: 'Brgy. Lagao, General Santos City'
    };
    const transactions = [
        { date: '2025-06-21', items: '5kg Mangoes, 3kg Tomatoes', total: '780.00', status: 'Delivered' },
        { date: '2025-06-15', items: '10kg Rice', total: '500.00', status: 'Pending' }
    ];
    const cartCount = 0;
    res.render('Profile/profile', { user, transactions, cartCount });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
