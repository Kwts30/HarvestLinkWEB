import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connect from '../server/database/mongodb-connect.js';
import User from '../models/User.js';

// Connect to database
connect();

const createAdminUser = async () => {
  try {
    // Get environment configuration
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}:${port}`;
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@harvestlink.com' });
    
    if (existingAdmin) {
      console.log('🔄 Admin user already exists');
      console.log('📧 Email: admin@harvestlink.com');
      console.log('🔑 Password: admin123');
      console.log('🔗 Access the admin dashboard at:', `${baseUrl}/admin`);
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'admin@harvestlink.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      phoneNumber: '09123456789'
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('🔗 Access the admin dashboard at:', `${baseUrl}/admin`);
    console.log('🔑 Login credentials:');
    console.log('   Email: admin@harvestlink.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
};

// Wait for database connection
setTimeout(createAdminUser, 1000);
