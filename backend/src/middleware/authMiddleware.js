const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Primary: Authorization header (API calls)
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        // Fallback: query-string token (browser-opened URLs like document downloads)
        token = req.query.token;
    }

    if (token) {
        try {
            // Verify token payload
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch User
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Not authorized, user missing' });
            }
            if (!user.isActive) {
                return res.status(403).json({ success: false, message: 'Account is deactivated' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);
            return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
        }
    } else {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };
