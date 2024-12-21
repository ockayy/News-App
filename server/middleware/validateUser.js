// middleware/validateUser.js
const validateUser = (req, res, next) => {
    const { email, password, name, role, location } = req.body;
    
    // Check if email is valid
    const validEmail = (userEmail) => {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userEmail);
    };

    // Check if password meets requirements
    const validPassword = (userPassword) => {
        return /^(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{6,}$/.test(userPassword);
    };

    if (!email || !validEmail(email)) {
        return res.status(400).json({ error: "Valid email is required" });
    }

    if (!password || !validPassword(password)) {
        return res.status(400).json({ 
            error: "Password must be at least 6 characters, first letter should be capital and contain at least one special character"
        });
    }

    if (!name) {
        return res.status(400).json({ error: "Username is required" });
    }

    const validRoles = ['Citizen Journalist', 'Professional Journalist', 'Analyst', 'Reader'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: "Valid role is required" });
    }

    if (!location) {
        return res.status(400).json({ error: "Location is required" });
    }

    next();
};

module.exports = validateUser;