const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

const generateAccessToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

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
