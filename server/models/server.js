import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import connect from '../database/mongodb-connect.js';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connect();

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and 127.0.0.1 with any port (including Live Preview :5500)
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

// Static files middleware - exclude HTML files to force EJS rendering
app.use(express.static(path.join(__dirname, '../../'), {
    setHeaders: (res, filePath) => {
        // Block direct access to HTML files
        if (path.extname(filePath) === '.html') {
            res.status(404).send('HTML files are not accessible. Please use EJS routes.');
            return;
        }
    }
}));

// Middleware to handle HTML file requests and redirect to EJS routes
app.use((req, res, next) => {
    // Only handle .html file requests
    if (req.url.endsWith('.html')) {
        const requestUrl = req.url;
        
        // Map HTML files to EJS routes
        const routeMap = {
            '/index.html': '/',
            '/Login webpage/login.html': '/login',
            '/Signup webpage/signup.html': '/signup',
            '/Shop webpage/shop.html': '/shop',
            '/cart webpage/cart.html': '/cart',
            '/Checkout webpage/checkout.html': '/checkout',
            '/Contacts webpage/contacts.html': '/contacts',
            '/Admin webpage/admin.html': '/admin'
        };
        
        // Check for exact match first
        if (routeMap[requestUrl]) {
            return res.redirect(routeMap[requestUrl]);
        }
        
        // Check for partial matches
        for (const [htmlPath, ejsRoute] of Object.entries(routeMap)) {
            if (requestUrl.includes(htmlPath.replace('.html', ''))) {
                return res.redirect(ejsRoute);
            }
        }
        
        // If no specific route found, return 404
        return res.status(404).send('Page not found. Please use the EJS routes: /, /shop, /login, /signup, /cart, /checkout, /contacts, /admin');
    }
    
    next();
});

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
import userRoutes from '../../routes/users.js';
import adminRoutes from '../../routes/admin.js';
import User from '../../models/User.js';

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
    res.render('index', { 
        title: 'HarvestLink - Fresh Farm Products',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/signup', (req, res) => {
    res.render('signup', { 
        title: 'HarvestLink - Sign Up',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/login', (req, res) => {
    res.render('login', { 
        title: 'HarvestLink - Login',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/cart', (req, res) => {
    res.render('cart', { 
        title: 'HarvestLink - Shopping Cart',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/checkout', (req, res) => {
    res.render('checkout', { 
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
    res.render('admin', { 
        title: 'HarvestLink - Admin Dashboard',
        user: req.session.user,
        isAuthenticated: true
    });
});

app.get('/shop', (req, res) => {
    res.render('shop', { 
        title: 'HarvestLink - Shop',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

app.get('/contacts', (req, res) => {
    res.render('contacts', { 
        title: 'HarvestLink - Contact Us',
        user: req.session.user || null,
        isAuthenticated: !!req.session.userId
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
