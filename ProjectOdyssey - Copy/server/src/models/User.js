const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  // Profile Settings
  displayName: {
    type: String,
    default: function () { return this.username; }
  },
  bio: {
    type: String,
    default: ""
  },
  profileImage: {
    type: String,
    default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop"
  },
  coverImage: {
    type: String,
    default: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop"
  },
  travelStyle: {
    type: [String],
    default: []
  },
  // Privacy Settings
  privacy: {
    publicProfile: { type: Boolean, default: true },
    showTripHistory: { type: Boolean, default: true },
    showReviewsPublicly: { type: Boolean, default: true }
  },
  // Travel Preferences
  preferences: {
    currency: { type: String, default: "USD - US Dollar" },
    budgetRange: { type: String, default: "$50 - $100 (Moderate)" },
    accommodation: { type: String, default: "Mid-range Hotels" }
  },
  // Notification Settings
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    tripReminders: { type: Boolean, default: true },
    friendActivity: { type: Boolean, default: true }
  },
  // Gamification
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  badges: [{
    id: String,
    earningDate: { type: Date, default: Date.now },
    isNew: { type: Boolean, default: true }
  }],
  // Streak tracking
  currentStreak: { type: Number, default: 0 },
  personalBest: { type: Number, default: 0 },
  lastActivityDate: { type: String, default: '' }, // Format: 'YYYY-MM-DD' UTC
  weeklyRecommendations: {
    type: Array,
    default: []
  },
  lastRecommendationWeek: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
