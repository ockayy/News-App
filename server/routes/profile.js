// routes/profile.js
const router = require('express').Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const validatePassword = require('../middleware/validatePassword');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: './uploads/profiles/',
    filename: function(req, file, cb) {
        cb(null, 'PROFILE-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).single('profile_pic');

// Check File Type
function checkFileType(file, cb) {
    // Allowed file types
    const filetypes = /jpeg|jpg|png/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Get profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT user_id, name, email, description, profile_pic, location, role FROM users WHERE user_id = $1',
            [req.user.user_id]
        );

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Update profile
router.put('/profile', authenticateToken, upload, async (req, res) => {
    try {
        const { name, description, location } = req.body;
        const userId = req.user.user_id;

        // Start building the query
        let updateQuery = 'UPDATE users SET ';
        const updateValues = [];
        let valueCounter = 1;

        // Add fields to update only if they're provided
        if (name) {
            updateQuery += `name = $${valueCounter}, `;
            updateValues.push(name);
            valueCounter++;
        }

        if (description) {
            updateQuery += `description = $${valueCounter}, `;
            updateValues.push(description);
            valueCounter++;
        }

        if (location) {
            updateQuery += `location = $${valueCounter}, `;
            updateValues.push(location);
            valueCounter++;
        }

        if (req.file) {
            updateQuery += `profile_pic = $${valueCounter}, `;
            updateValues.push(req.file.path);
            valueCounter++;
        }

        // Remove trailing comma and space
        updateQuery = updateQuery.slice(0, -2);

        // Add WHERE clause
        updateQuery += ` WHERE user_id = $${valueCounter} RETURNING *`;
        updateValues.push(userId);

        // Execute query only if there are fields to update
        if (updateValues.length > 0) {
            const updatedUser = await pool.query(updateQuery, updateValues);

            res.json({
                message: "Profile updated successfully",
                user: {
                    id: updatedUser.rows[0].user_id,
                    name: updatedUser.rows[0].name,
                    email: updatedUser.rows[0].email,
                    description: updatedUser.rows[0].description,
                    location: updatedUser.rows[0].location,
                    profile_pic: updatedUser.rows[0].profile_pic
                }
            });
        } else {
            res.status(400).json({ error: "No fields to update" });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Change Password
router.put('/change-password', authenticateToken, validatePassword, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.user_id;

        // Verify current password
        const user = await pool.query(
            'SELECT password FROM users WHERE user_id = $1',
            [userId]
        );

        const validPassword = await bcrypt.compare(currentPassword, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.query(
            'UPDATE users SET password = $1 WHERE user_id = $2',
            [hashedPassword, userId]
        );

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Change Email
router.put('/change-email', authenticateToken, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const userId = req.user.user_id;

        // Validate new email
        const validEmail = (email) => {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
        };

        if (!newEmail || !validEmail(newEmail)) {
            return res.status(400).json({ error: "Valid email is required" });
        }

        if (!password) {
            return res.status(400).json({ error: "Password is required to change email" });
        }

        // Check if new email already exists
        const emailExists = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND user_id != $2',
            [newEmail, userId]
        );

        if (emailExists.rows.length > 0) {
            return res.status(400).json({ error: "Email already in use" });
        }

        // Verify password
        const user = await pool.query(
            'SELECT password FROM users WHERE user_id = $1',
            [userId]
        );

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        // Update email
        await pool.query(
            'UPDATE users SET email = $1 WHERE user_id = $2',
            [newEmail, userId]
        );

        res.json({ 
            message: "Email updated successfully",
            newEmail: newEmail
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
