const User = require('../models/User');
const authService = require('../services/auth.service');
const { registerValidation } = require('../validators/register.validation');
const { loginValidation } = require('../validators/login.validation');

const register = async (req, res) => {
    try {
        const { error, value } = registerValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        let { name, email, phone, password, role } = value;

        // --- ADD ROLE MAPPING HERE ---
        const roleMapping = {
            patient: 'MOTHER',
            worker: 'HEALTH_WORKER',
            admin: 'ADMIN'
        }

        const dbRole = roleMapping[role] || 'MOTHER';
        // -----------------------------

        if (email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
        }

        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            return res.status(400).json({ success: false, message: 'Phone already exists' });
        }

        const passwordHash = await authService.hashPassword(password);

        // Save with the dbRole instead of the raw role from the frontend
        const user = await User.create({ name, email, phone, passwordHash, role: dbRole });
        const token = authService.generateAccessToken(user);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: authService.sanitizeUser(user)
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { error, value } = loginValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { email, phone, password } = value;

        const query = email ? { email } : { phone };
        const user = await User.findOne(query);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated' });
        }

        const isMatch = await authService.comparePassword(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = authService.generateAccessToken(user);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: authService.sanitizeUser(user)
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getMe = async (req, res) => {
    try {
        return res.status(200).json({ success: true, user: authService.sanitizeUser(req.user) });
    } catch (err) {
        console.error('Me endpoint error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    // JWT uses stateless deletion on the client-side. We return a clean OK.
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

module.exports = { register, login, getMe, logout };
