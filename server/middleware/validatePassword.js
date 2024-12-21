// middleware/validatePassword.js
const validatePassword = (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    
    // Password must be at least 6 characters and contain special character
    const validPassword = (password) => {
        return /^(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{6,}$/.test(password);
    };

    if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
    }

    if (!newPassword || !validPassword(newPassword)) {
        return res.status(400).json({ 
            error: "New password must be at least 6 characters and contain at least one special character and one uppercase letter"
        });
    }

    next();
};

module.exports = validatePassword;
