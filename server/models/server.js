import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import connect from '../database/mongodb-connect.js';
import cors from 'cors';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connect();

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

app.use(express.static(path.join(__dirname, '../../')));

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
    res.sendFile(path.join(__dirname, '../../index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Signup webpage/signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Login webpage/login.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, '../../cart webpage/cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Checkout webpage/checkout.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Admin webpage/admin.html'));
});

app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Shop webpage/shop.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
