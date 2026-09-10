const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        // Header looks like:
        // Bearer eyJhbGciOiJIUzI1NiIs...
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Access token required"
            });
        }

        // Verify access token
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        // Store user information in request
        req.user = decoded;

        // Token is valid → continue to controller
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};

module.exports = authenticate;