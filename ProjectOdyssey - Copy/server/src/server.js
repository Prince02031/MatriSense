require('dotenv').config(); // Load .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // <--- CRITICAL FOR FRONTEND CONNECTION
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const protectedRoutes = require("./routes/protected");
const aiRoutes = require("./routes/ai.routes");
const placeRoutes = require("./routes/placeRoutes");
const clusteringRoutes = require("./routes/clustering.routes");
const tripRoutes = require("./routes/tripRoutes");
const chatHistoryRoutes = require("./routes/chatHistory.routes");
const testRoutes = require("./routes/testRoutes"); // New Test Routes
const mapRoutes = require("./routes/mapRoutes"); // Map Search & Manual Planning
const visitRoutes = require("./routes/visitRoutes"); // Visit Tracking Routes
const postRoutes = require("./routes/postRoutes"); // Social Feed - Posts
const commentRoutes = require("./routes/commentRoutes"); // Social Feed - Comments
const likeRoutes = require("./routes/likeRoutes"); // Social Feed - Likes
const savedPostRoutes = require("./routes/savedPostRoutes"); // Social Feed - Saved Posts
const followRoutes = require('./routes/followRoutes'); // Follow / Friends
const userRoutes = require('./routes/userRoutes'); // User Search & Public Profiles
const reviewRoutes = require("./routes/reviewRoutes"); // Review Routes
const notificationRoutes = require('./routes/notificationRoutes'); // Notifications
const uploadRoutes = require("./routes/uploadRoutes"); // Upload Routes
const groupRoutes = require("./routes/groupRoutes"); // Group Trip Planning
const groupChatRoutes = require('./routes/groupChatRoutes'); // Group Chat
const recommendationRoutes = require("./routes/recommendationRoutes");
const gamificationRoutes = require("./routes/gamificationRoutes");
const imageRoutes = require("./routes/imageRoutes");
const { startScheduler } = require("./services/recommendationScheduler");

const app = express();

// 1. Enable CORS (Allow localhost:3000 to talk to this server)
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  // origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://113.11.100.133:55680"],
  credentials: true
}));


// 2. Body Parser (So we can read JSON)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Connect Database
connectDB();

// 4. Root Route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 Project Odyssey API Server",
    version: "1.0.0",
    status: "online",
    endpoints: {
      auth: "/api/auth/login, /api/auth/signup",
      visits: "/api/visits/check-in, /api/visits/check-out, /api/visits/logs/:itineraryId",
      trips: "/api/trips",
      places: "/api/places",
      ai: "/api/ai",
      chat: "/api/chat",
      map: "/api/map",
      clustering: "/api/clustering",
      groups: "/api/groups",
      social: {
        posts: "/api/posts",
        comments: "/api/comments",
        likes: "/api/likes/:postId",
        savedPosts: "/api/saved-posts"
      }
    }
  });
});

// 5. Mount Routes
app.use("/api/ai", aiRoutes);


// This means "server/src/routes/auth.js" becomes "http://localhost:PORT/api/auth/..."
app.use('/api/auth', authRoutes);
app.use('/api/user', protectedRoutes);
app.use('/api', placeRoutes); // Place routes
app.use('/api/clustering', clusteringRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/chat', chatHistoryRoutes); // Chat history routes
app.use('/api/test', testRoutes); // Mount Test Routes
app.use('/api/admin', require("./routes/adminRoutes")); // Admin Routes
app.use('/api/map', mapRoutes); // Map Search & Manual Planning
app.use('/api/visits', visitRoutes); // Visit Tracking Routes
app.use('/api/posts', postRoutes); // Social Feed - Posts
app.use('/api/comments', commentRoutes); // Social Feed - Comments
app.use('/api/likes', likeRoutes); // Social Feed - Likes
app.use('/api/saved-posts', savedPostRoutes); // Social Feed - Saved Posts
app.use('/api/follow', followRoutes); // Follow / Friends
app.use('/api/users', userRoutes); // User Search & Public Profiles
app.use('/api/notifications', notificationRoutes); // Notifications
app.use('/api/groups', groupRoutes); //DEATRAX: From Incoming
app.use('/api/groups/:groupId/messages', groupChatRoutes); // Group Chat
app.use('/api/reviews', reviewRoutes); //DEATRAX: From Current
app.use('/api/upload', uploadRoutes); //DEATRAX: From Current
app.use('/api/recommendations', recommendationRoutes); //DEATRAX: From Current
app.use('/api/admin/images', imageRoutes); // Image Management
app.use('/api/gamification', gamificationRoutes); // Gamification Stats

// 5. Start Scheduler
startScheduler();

// 5. Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`👉 Login Route: http://localhost:${PORT}/api/auth/login`);
  console.log(`👉 Signup Route: http://localhost:${PORT}/api/auth/signup`);
});