// utils/jwtGenerator.js
const jwt = require('jsonwebtoken');

const generateToken = (user_id) => {
    return jwt.sign(
        { user_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

module.exports = generateToken;
