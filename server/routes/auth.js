const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authMiddleware');
const pool = require('../config/db');
const validateUser = require('../middleware/validateUser.js');
const generateToken = require('../utils/jwtGenerator');

// SignUp
router.post('/signup', validateUser, async (req, res) => {
    try {
        const { email, password, name, role, location } = req.body;

        // Check if user exists
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role, location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, hashedPassword, role, location]
        );

        // Generate token
        const token = generateToken(newUser.rows[0].user_id);

        // Update user_token in database
        await pool.query(
            'UPDATE users SET user_token = $1 WHERE user_id = $2',
            [token, newUser.rows[0].user_id]
        );

        res.status(201).json({
            message: "User created successfully",
            token,
            user: {
                id: newUser.rows[0].user_id,
                name: newUser.rows[0].name,
                email: newUser.rows[0].email,
                role: newUser.rows[0].role,
                location: newUser.rows[0].location
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Signout
router.post('/signout', authenticateToken, async (req, res) => {
    try {
        // Clear user_token in database
        await pool.query(
            'UPDATE users SET user_token = NULL WHERE user_id = $1',
            [req.user.user_id]
        );

        res.json({ message: "Successfully signed out" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: "Please provide email and password" });
        }

        // Check if user exists
        const user = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate token
        const token = generateToken(user.rows[0].user_id);

        // Update user_token in database
        await pool.query(
            'UPDATE users SET user_token = $1 WHERE user_id = $2',
            [token, user.rows[0].user_id]
        );

        // Send response
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.rows[0].user_id,
                name: user.rows[0].name,
                email: user.rows[0].email,
                role: user.rows[0].role,
                location: user.rows[0].location
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;
