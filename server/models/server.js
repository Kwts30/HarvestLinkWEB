import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import connect from '../database/mongodb-connect.js';
import productRoutes from '../../routes/products.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connect();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api', productRoutes);

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, 'Shop webpage/shop.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
