const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  if (token.startsWith("Bearer ")) token = token.slice(7, token.length);

  try {
    console.log("Verifying token with JWT_SECRET:", process.env.JWT_SECRET ? "✓ Set" : "✗ Not set");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully for user:", decoded.username);
    req.user = decoded; 
    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    return res.status(401).json({ message: "Token is not valid", error: err.message });
  }
};

module.exports = protect;

// its job is to protect routes so only users with a valid JWT can access them.