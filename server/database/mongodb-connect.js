import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default function connect() {
    // Get base connection string from environment
    const baseUri = process.env.MONGODB_URI || "mongodb+srv://jarylbenedicto:jmiBzwDTMiGwte2x@harvestlink.zagrez4.mongodb.net/?retryWrites=true&w=majority&appName=HarvestLink";
    
    // Add database name - you can change this to match your existing database
    const databaseName = process.env.DB_NAME || "HarvestLink";
    const database = baseUri.replace("/?", `/${databaseName}?`);
    
    console.log(`🔄 Connecting to database: ${databaseName}`);
    
    mongoose
        .connect(database)
        .then(() => {
            console.log("✅ Connected to MongoDB Atlas Database");
            console.log(`🌐 Database: ${mongoose.connection.name}`);
            console.log(`📊 Collections will be created automatically when data is inserted`);
        })
        .catch((error) => {
            console.error("❌ MongoDB connection error:", error.message);
            console.log("💡 Tip: Check your database name and Atlas permissions");
            process.exit(1);
        });

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ Disconnected from MongoDB Atlas');
    });

    mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
    });
}