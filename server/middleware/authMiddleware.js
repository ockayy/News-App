// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists and token matches
        const user = await pool.query(
            'SELECT * FROM users WHERE user_id = $1 AND user_token = $2',
            [decoded.user_id, token]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Invalid token." });
        }

        req.user = user.rows[0];
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: "Please authenticate." });
    }
};

module.exports = authenticateToken;