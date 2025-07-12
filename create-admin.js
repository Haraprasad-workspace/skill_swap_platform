const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const userModel = require('./models/usermodel.js');

async function createAdmin() {
  try {
    // Find the first user
    const firstUser = await userModel.findOne().sort({ createdAt: 1 });
    
    if (!firstUser) {
      console.log('No users found. Please register a user first.');
      return;
    }

    // Make the first user an admin
    await userModel.findByIdAndUpdate(firstUser._id, { isAdmin: true });
    
    console.log(`✅ Successfully made ${firstUser.email} an admin!`);
    console.log(`📧 Admin email: ${firstUser.email}`);
    console.log(`🔗 Admin panel: http://localhost:3000/admin`);
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin(); 