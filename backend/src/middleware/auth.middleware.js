const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice("Bearer ".length)
            : null;
        const token = bearerToken || req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};

module.exports = authenticate;
