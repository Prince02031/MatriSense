const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri || uri.includes('your_db_name') || uri.includes('your_')) {
        console.error('⚠️  WARNING: MONGODB_URI is not configured properly in .env');
        console.error('   Please set a valid MongoDB Atlas connection string.');
        console.error('   The server will continue running but database operations will fail.');
        return;
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        console.error('   The server will continue running but database operations will fail.');
    }
};

module.exports = connectDB;
