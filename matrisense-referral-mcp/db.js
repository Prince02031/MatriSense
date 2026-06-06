require('dotenv').config({ path: '../backend/.env' });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrisense';
    await mongoose.connect(connUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.error(`MongoDB Connected for MCP Server: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
