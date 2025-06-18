import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default function connect() {
    // Get base connection string from environment
    const baseUri = process.env.MONGODB_URI || MONGODB_URI;
      // Add database name - using lowercase to match existing database
    const databaseName = process.env.DB_NAME || DB_NAME;
    const database = baseUri.replace("/?", `/${databaseName}?`);
    
    console.log(`Connecting to database: ${databaseName}`);
    
    mongoose
        .connect(database)
        .then(() => {
            console.log("Connected to Database");
            console.log(`Database Name: ${mongoose.connection.name}`);
            console.log(`The database is Ready to use.`);
        })
        .catch((error) => {
            console.error("Database connection error:", error.message);
            process.exit(1);
        });

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
        console.log('Disconnected from the database');
    });

    mongoose.connection.on('error', (error) => {
        console.error('Database connection error:', error);
    });
}