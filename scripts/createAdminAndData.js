import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:admin@cluster0.mongodb.net/harvestlink?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@harvestlink.com' });
    if (existingAdmin) {
      console.log('🔄 Admin user already exists');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'admin@harvestlink.com',
      password: hashedPassword,
      role: 'admin',
      phoneNumber: '09123456789'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@harvestlink.com');
    console.log('🔑 Password: admin123');
    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

// Create sample users
const createSampleUsers = async () => {
  try {    const sampleUsers = [
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
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ User created: ${userData.firstName} ${userData.lastName}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample users:', error);
  }
};

// Create sample products
const createSampleProducts = async () => {
  try {
    const sampleProducts = [
      {
        name: 'Fresh Tomatoes',
        description: 'Locally grown fresh tomatoes, perfect for cooking and salads',
        price: 120.00,
        category: 'vegetables',
        stock: 50,
        unit: 'kg',
        image: '../assets/shop/tomatoes.png',
        isActive: true
      },
      {
        name: 'Organic Carrots',
        description: 'Organic carrots grown without pesticides',
        price: 80.00,
        category: 'vegetables',
        stock: 30,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Sweet Corn',
        description: 'Sweet and juicy corn kernels',
        price: 60.00,
        category: 'vegetables',
        stock: 25,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Fresh Lettuce',
        description: 'Crispy lettuce leaves perfect for salads',
        price: 45.00,
        category: 'vegetables',
        stock: 40,
        unit: 'pcs',
        isActive: true
      },
      {
        name: 'Red Onions',
        description: 'Fresh red onions for cooking',
        price: 90.00,
        category: 'vegetables',
        stock: 35,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Green Bell Peppers',
        description: 'Fresh green bell peppers',
        price: 150.00,
        category: 'vegetables',
        stock: 20,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Banana',
        description: 'Sweet and ripe bananas',
        price: 70.00,
        category: 'fruits',
        stock: 60,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Mango',
        description: 'Sweet Philippine mangoes',
        price: 200.00,
        category: 'fruits',
        stock: 15,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Rice',
        description: 'Premium white rice',
        price: 50.00,
        category: 'grains',
        stock: 100,
        unit: 'kg',
        isActive: true
      },
      {
        name: 'Corn Grits',
        description: 'Ground corn for cooking',
        price: 40.00,
        category: 'grains',
        stock: 45,
        unit: 'kg',
        isActive: true
      }
    ];

    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ name: productData.name });
      if (!existingProduct) {
        const product = new Product(productData);
        await product.save();
        console.log(`✅ Product created: ${productData.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample products:', error);
  }
};

// Create sample transactions
const createSampleTransactions = async () => {
  try {
    const users = await User.find({ role: 'user' });
    const products = await Product.find({ isActive: true });

    if (users.length === 0 || products.length === 0) {
      console.log('⚠️ No users or products found for creating transactions');
      return;
    }    const sampleTransactions = [
      {
        user: users[0]._id,
        items: [
          {
            product: products[0]._id,
            name: products[0].name,
            quantity: 2,
            price: products[0].price,
            subtotal: products[0].price * 2
          },
          {
            product: products[1]._id,
            name: products[1].name,
            quantity: 1,
            price: products[1].price,
            subtotal: products[1].price * 1
          }
        ],
        totalAmount: (products[0].price * 2) + (products[1].price * 1),
        status: 'completed',
        transactionId: 'TXN001',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        user: users[1]._id,
        items: [
          {
            product: products[2]._id,
            name: products[2].name,
            quantity: 3,
            price: products[2].price,
            subtotal: products[2].price * 3
          }
        ],
        totalAmount: products[2].price * 3,
        status: 'pending',
        transactionId: 'TXN002',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        user: users[2]._id,
        items: [
          {
            product: products[3]._id,
            name: products[3].name,
            quantity: 5,
            price: products[3].price,
            subtotal: products[3].price * 5
          },
          {
            product: products[4]._id,
            name: products[4].name,
            quantity: 2,
            price: products[4].price,
            subtotal: products[4].price * 2
          }
        ],
        totalAmount: (products[3].price * 5) + (products[4].price * 2),
        status: 'completed',
        transactionId: 'TXN003',
        createdAt: new Date() // Today
      }
    ];

    for (const transactionData of sampleTransactions) {
      const existingTransaction = await Transaction.findOne({ transactionId: transactionData.transactionId });
      if (!existingTransaction) {
        const transaction = new Transaction(transactionData);
        await transaction.save();
        console.log(`✅ Transaction created: ${transactionData.transactionId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample transactions:', error);
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting database setup...');
  
  await connectDB();
  
  console.log('\n📊 Creating sample data...');
  await createAdminUser();
  await createSampleUsers();
  await createSampleProducts();
  await createSampleTransactions();
  
  console.log('\n✅ Database setup completed!');
  console.log('\n🔗 You can now access the admin dashboard at:');
  console.log('   http://localhost:3000/Admin%20webpage/admin.html');
  console.log('\n🔑 Login credentials:');
  console.log('   Email: admin@harvestlink.com');
  console.log('   Password: admin123');
  
  mongoose.connection.close();
};

main().catch(console.error);
