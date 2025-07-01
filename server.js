import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import connect from './database/mongodb-connect.js';
import cors from 'cors';
import multer from 'multer';

// Import routes and middlewares
import routes from './routes/index.js';
import apiRoutes from './routes/api/routes.js';
import { redirectIfNotAuthenticated, redirectIfAuthenticated, validateSession, requireAdminPage } from './middlewares/index.js';
import { ensureUploadsDir } from './middlewares/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connect();

// Ensure uploads directory exists
ensureUploadsDir();

// Helper function to get cart count for a user
async function getCartCount(userId) {
    if (!userId) return 0;
    try {
        const Cart = (await import('./models/cart.js')).default;
        const cart = await Cart.findOne({ userId });
        return cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
    } catch (error) {
        console.error('Error getting cart count:', error);
        return 0;
    }
}

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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve home page specific CSS and JS files
app.use('/home', express.static(path.join(__dirname, 'views', 'home')));

// Global CSS and JS files (point to home for now, but can be moved later)
app.use('/style.css', express.static(path.join(__dirname, 'views', 'home', 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'views', 'home', 'script.js')));

// Serve CSS and JS files from view subdirectories
app.use('/views', express.static(path.join(__dirname, 'views')));

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

// Session validation middleware
app.use(validateSession);

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'homepage', 'harvestlink logo.png'));
});

// API and auth routes
app.use('/', routes);
app.use('/api', apiRoutes);

// Page routes
app.get('/', async (req, res) => {
    const cartCount = await getCartCount(req.session.userId);
    res.render('home', { 
        title: 'HarvestLink - Fresh Goods for You',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId,
        cartCount
    });
});

app.get('/signup', redirectIfAuthenticated, (req, res) => {
    res.render('Signup/signup', { 
        title: 'HarvestLink - Sign Up',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('Login/login', { 
        title: 'HarvestLink - Login',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/cart', redirectIfNotAuthenticated, async (req, res) => {
    const cartCount = await getCartCount(req.session.userId);
    res.render('Cart/cart', { 
        title: 'HarvestLink - Shopping Cart',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId,
        cartCount
    });
});

app.get('/checkout', redirectIfNotAuthenticated, async (req, res) => {
    const cartCount = await getCartCount(req.session.userId);
    res.render('Checkout/checkout', { 
        title: 'HarvestLink - Checkout',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId,
        cartCount
    });
});

app.get('/admin', requireAdminPage, async (req, res) => {
    const cartCount = await getCartCount(req.session.userId);
    res.render('Admin/admin', { 
        title: 'HarvestLink - Admin Dashboard',
        user: req.session.user,
        isAuthenticated: true,
        cartCount
    });
});

app.get('/shop', async (req, res) => {
    const cartCount = await getCartCount(req.session.userId);
    res.render('Shop/shop', { 
        title: 'HarvestLink - Shop',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId,
        cartCount
    });
});

app.get('/contacts', async (req, res) => {
    const cartCount = await getCartCount(req.session.userId);
    res.render('Contacts/contacts', { 
        title: 'HarvestLink - Contact',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId,
        cartCount
    });
});

app.get('/profile', redirectIfNotAuthenticated, async (req, res) => {
    try {
        const cartCount = await getCartCount(req.session.userId);
        
        // Get actual transactions from database
        const Transaction = (await import('./models/Transaction.js')).default;
        const userTransactions = await Transaction.find({ 
            userId: req.session.userId 
        })
        .sort({ createdAt: -1 }) // Sort by newest first
        .limit(10) // Limit to last 10 transactions
        .populate('items.productId', 'name') // Populate product names
        .exec();

        // Format transactions for display
        const formattedTransactions = userTransactions.map(transaction => ({
            date: transaction.createdAt.toISOString().split('T')[0],
            items: transaction.items.map(item => 
                `${item.productId?.name || 'Unknown Product'} (${item.quantity}x)`
            ).join(', '),
            total: transaction.totalAmount.toFixed(2),
            status: transaction.status || 'pending'
        }));

        res.render('Profile/profile', { 
            title: 'HarvestLink - Profile',
            user: req.session.user || null,
            isAuthenticated: !!req.session.userId,
            transactions: formattedTransactions,
            cartCount: cartCount
        });
    } catch (error) {
        console.error('Profile page error:', error);
        res.render('Profile/profile', { 
            title: 'HarvestLink - Profile',
            user: req.session.user || null,
            isAuthenticated: !!req.session.userId,
            transactions: [],
            cartCount: 0
        });
    }
});

// Multer error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum allowed size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum allowed is 1 file.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${error.message}`
        });
    }
    
    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed!'
        });
    }
    
    next(error);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
