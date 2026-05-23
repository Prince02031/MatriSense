const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Hash a plain text password
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    // Added await here for consistency
    return await bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with hashed password
 * Added a check to prevent "Illegal arguments: string, undefined" crash
 */
const comparePassword = async (password, hash) => {
    // If hash is missing (user was registered incorrectly), return false instead of crashing
    if (!password || !hash) {
        console.error('Auth Error: password or hash is missing for comparison.');
        return false;
    }
    return await bcrypt.compare(password, hash);
};

/**
 * Generate a JWT access token
 */
const generateAccessToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign(
        { userId: user._id, role: user.role },
        secret,
        { expiresIn: '7d' }
    );
};

/**
 * Remove sensitive data before sending user object to client
 */
const sanitizeUser = (user) => {
    // If it's a mongoose document, use toObject, otherwise use spread
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
};

module.exports = {
    hashPassword,
    comparePassword,
    generateAccessToken,
    sanitizeUser
};