const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );
};

// -- API -- //

// SIGNUP
router.post("/signup", async (req, res, next) => {
  console.log("Signup Route Hit!"); // <--- Add this
  // console.log("Body:", req.body);   // <--- Add this
  try {
    const { username, password, email, dob } = req.body;
    if (!username || !password || !email || !dob)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: "Username or email already taken" });

    const newUser = await User.create({ username, password, email, dob });
    const token = generateToken(newUser)

    res.status(201).json({
      message: "Signup successful",
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email, dob: newUser.dob },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ message: "Invalid username or password" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid username or password" });

    const token = generateToken(user);

    res.json({
      message: "Login successful!",
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
