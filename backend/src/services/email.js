const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const sendEmail = require("../services/email");
const {
    createUser,
    findUserByEmail,
    updateUserPassword
} = require('../models/user.model');

const otpStore = new Map();

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
};

const sanitizeUser = (user) => {
    const { password, ...safeUser } = user;
    return safeUser;
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const existUser = await findUserByEmail(email);

        if (existUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const user = await createUser(name, email, hashPassword);

        const { accessToken, refreshToken } = generateTokens(user);

        await sendEmail(
            email,
            'Nice to Meet You! 👋',
            `Hi ${name}!

Nice to meet you! 👋

We're happy to have you with us.
Your account has been created successfully.

Have a great day!

Best regards,
The Team`
        );

        return res.status(201).json({
            message: "User created successfully",
            user: sanitizeUser(user),
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token required"
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const newAccessToken = jwt.sign(
            { id: decoded.id },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "15m" }
        );

        return res.status(200).json({
            accessToken: newAccessToken
        });

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
};

const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user: sanitizeUser(user)
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


// Forgot password

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const resetToken = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_RESET_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const resetLink =
            `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        await sendEmail(
            email,
            "Reset Your Password",
            `Hi ${user.name},

Click the link below to reset your password:

${resetLink}

This link will expire in 15 minutes.

Best regards,
The Team`
        );

        return res.status(200).json({
            message: "Password reset link sent to your email"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


// Reset password

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!token) {
            return res.status(400).json({
                message: "Reset token is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                message: "New password is required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_RESET_SECRET
        );

        const user = await findUserByEmail(decoded.email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await updateUserPassword(
            user.id,
            hashedPassword
        );

        return res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error(error);

        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired reset token"
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


// Send OTP

const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        await sendEmail(
            email,
            "Your Login OTP",
            `Hi ${user.name},

Your OTP is:

${otp}

This OTP will expire in 5 minutes.

Best regards,
The Team`
        );

        return res.status(200).json({
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


// Verify OTP and login

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        const storedOtp = otpStore.get(email);

        if (!storedOtp) {
            return res.status(401).json({
                message: "OTP not found or expired"
            });
        }

        if (Date.now() > storedOtp.expiresAt) {
            otpStore.delete(email);

            return res.status(401).json({
                message: "OTP expired"
            });
        }

        if (storedOtp.otp !== otp) {
            return res.status(401).json({
                message: "Invalid OTP"
            });
        }

        otpStore.delete(email);

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const { accessToken, refreshToken } =
            generateTokens(user);

        return res.status(200).json({
            message: "OTP verified successfully",
            user: sanitizeUser(user),
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


module.exports = {
    registerUser,
    getUserByEmail,
    loginUser,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    sendOtp,
    verifyOtp
};