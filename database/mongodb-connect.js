import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Default connection strings (fallback if env variables are not set)
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017';
const DEFAULT_DB_NAME = 'harvestlink';

export default function connect() {
    // Get connection string from environment
    const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    const databaseName = process.env.DB_NAME || DEFAULT_DB_NAME;
    
    // If using Atlas URI, it already includes the database name placeholder
    let connectionString;
    if (mongoUri.includes('mongodb+srv://')) {
        // MongoDB Atlas - replace the database placeholder
        connectionString = mongoUri.replace('/?', `/${databaseName}?`);
    } else {
        // Local MongoDB - append database name
        connectionString = `${mongoUri}/${databaseName}`;
    }
    
    console.log(`Connecting to database: ${databaseName}`);
    console.log(`Using MongoDB Atlas: ${mongoUri.includes('mongodb+srv://') ? 'Yes' : 'No'}`);    
    mongoose
        .connect(connectionString)
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