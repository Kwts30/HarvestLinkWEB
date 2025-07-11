import express from 'express';
import apiRoutes from './api/routes.js';
import authRoutes from './auth/routes.js';
import userRoutes from './user/routes.js';
import adminRoutes from './admin/routes.js';
import addressRoutes from './address/routes.js';

const router = express.Router();

// Mount all API route modules
router.use('/api', apiRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes); // Direct user routes
router.use('/api/users', userRoutes); // Includes auth routes for backward compatibility
router.use('/api/admin', adminRoutes);
router.use('/api/addresses', addressRoutes); // Address management routes

export default router;
