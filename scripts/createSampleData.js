import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connect from '../server/database/mongodb-connect.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

// Connect to database
connect();

const createSampleData = async () => {
  try {
    console.log('🔍 Checking existing data...');
    
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    
    console.log(`👥 Current Users: ${userCount}`);
    console.log(`📦 Current Products: ${productCount}`);
    
    // Create some sample users if none exist
    if (userCount <= 1) { // Only admin exists
      console.log('📝 Creating sample users...');
      
      const sampleUsers = [
        {
          firstName: 'John',
          lastName: 'Farmer',
          username: 'johnfarmer',
          email: 'john.farmer@email.com',
          password: await bcrypt.hash('password123', 10),
          role: 'user',
          phoneNumber: '09171234567'
        },
        {
          firstName: 'Maria',
          lastName: 'Santos',
          username: 'mariasantos',
          email: 'maria.santos@email.com',
          password: await bcrypt.hash('password123', 10),
          role: 'user',
          phoneNumber: '09182345678'
        },
        {
          firstName: 'Pedro',
          lastName: 'Cruz',
          username: 'pedrocruz',
          email: 'pedro.cruz@email.com',
          password: await bcrypt.hash('password123', 10),
          role: 'user',
          phoneNumber: '09193456789'
        }
      ];

      for (const userData of sampleUsers) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ User created: ${userData.firstName} ${userData.lastName}`);
      }
    }
    
    // Create some sample products if none exist
    if (productCount === 0) {
      console.log('📝 Creating sample products...');
      
      const sampleProducts = [
        {
          name: 'Fresh Tomatoes',
          description: 'Premium quality fresh tomatoes',
          price: 45.00,
          category: 'Vegetables',
          stock: 100,
          unit: 'kg',
          farmer: 'Local Farm Co.',
          isActive: true
        },
        {
          name: 'Organic Carrots',
          description: 'Organic carrots grown locally',
          price: 35.00,
          category: 'Vegetables',
          stock: 80,
          unit: 'kg',
          farmer: 'Green Valley Farm',
          isActive: true
        },
        {
          name: 'Sweet Corn',
          description: 'Fresh sweet corn',
          price: 25.00,
          category: 'Vegetables',
          stock: 60,
          unit: 'piece',
          farmer: 'Sunshine Farm',
          isActive: true
        },
        {
          name: 'Green Lettuce',
          description: 'Crispy fresh lettuce',
          price: 30.00,
          category: 'Vegetables',
          stock: 50,
          unit: 'head',
          farmer: 'Fresh Fields Farm',
          isActive: true
        },
        {
          name: 'Red Onions',
          description: 'Premium red onions',
          price: 40.00,
          category: 'Vegetables',
          stock: 90,
          unit: 'kg',
          farmer: 'Valley Farm',
          isActive: true
        }
      ];

      for (const productData of sampleProducts) {
        const product = new Product(productData);
        await product.save();
        console.log(`✅ Product created: ${productData.name}`);
      }
    }
    
    // Final count
    const finalUserCount = await User.countDocuments();
    const finalProductCount = await Product.countDocuments();
    
    console.log('\n📊 Final Database Contents:');
    console.log(`👥 Total Users: ${finalUserCount}`);
    console.log(`📦 Total Products: ${finalProductCount}`);
    console.log('✅ Sample data creation completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
};

// Wait for database connection
setTimeout(createSampleData, 1000);
