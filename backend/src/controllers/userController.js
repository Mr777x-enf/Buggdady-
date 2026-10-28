
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
    createHash,
    randomBytes,
    randomInt,
    timingSafeEqual
} = require("crypto");

const sendEmail = require("../services/email");

const {
    createUser,
    findUserByEmail,
    saveEmailVerificationToken,
    markEmailVerified,
    clearEmailVerificationSentAt,
    setPasswordResetToken,
    updateUserPassword
} = require("../models/user.model");

const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === "production";
const sameSite = String(
    process.env.COOKIE_SAME_SITE || "lax"
).toLowerCase();

if (!["strict", "lax", "none"].includes(sameSite)) {
    throw new Error("COOKIE_SAME_SITE must be strict, lax, or none");
}

const baseCookieOptions = {
    httpOnly: true,
    secure: isProd || sameSite === "none",
    sameSite,
    path: "/",
    ...(process.env.COOKIE_DOMAIN
        ? { domain: process.env.COOKIE_DOMAIN }
        : {})
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
    if (!accessToken || !refreshToken) {
        throw new Error("Both authentication tokens are required");
    }

    res.cookie("accessToken", accessToken, {
        ...baseCookieOptions,
        maxAge: ACCESS_MAX_AGE
    });

    res.cookie("refreshToken", refreshToken, {
        ...baseCookieOptions,
        maxAge: REFRESH_MAX_AGE
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie("accessToken", baseCookieOptions);
    res.clearCookie("refreshToken", baseCookieOptions);
};

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
};

const sanitizeUser = (user) => {
    const {
        password,
        reset_token_hash,
        reset_password_token,
        email_verified,
        email_verification_token_hash,
        email_verification_expires,
        email_verification_sent_at,
        ...safeUser
    } = user;

    return safeUser;
};

const normalizeEmail = (email) =>
    typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

const safeEqual = (a, b) => {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));

    return (
        bufA.length === bufB.length &&
        timingSafeEqual(bufA, bufB)
    );
};

const verifyJwt = (token, secret) => {
    try {
        return jwt.verify(token, secret);
    } catch {
        return null;
    }
};

const deliverVerificationEmail = async (user, token, tokenHash) => {
    const frontendUrl = (
        process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");
    const verificationLink =
        `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    try {
        await sendEmail(
            user.email,
            "Verify Your Email",
            `Hi ${user.name},

Click the link below to verify your email address:

${verificationLink}

This link will expire in 24 hours.

Best regards,
The Team`
        );
    } catch (cause) {
        await clearEmailVerificationSentAt(user.id, tokenHash);
        const error = new Error("Verification email delivery failed", { cause });
        error.code = "EMAIL_DELIVERY_FAILED";
        throw error;
    }
};

const sendVerificationEmail = async (user) => {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    const savedUser = await saveEmailVerificationToken(
        user.id,
        tokenHash,
        expiresAt,
        true
    );

    if (!savedUser) {
        throw new Error("Unable to create email verification token");
    }

    await deliverVerificationEmail(savedUser, token, tokenHash);
};

const registerUser = async (req, res) => {
    try {
        const password = req.body.password;
        const name = typeof req.body.name === "string"
            ? req.body.name.trim()
            : "";
        const email = normalizeEmail(req.body.email);

        if (
            !name ||
            !email ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (name.length > 100) {
            return res.status(400).json({
                message: "Name must be 100 characters or fewer"
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: "Enter a valid email address"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser = await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser(name, email, hashedPassword);

        try {
            await sendVerificationEmail(user);
        } catch (emailError) {
            if (emailError.code !== "EMAIL_DELIVERY_FAILED") {
                throw emailError;
            }

            console.error("Verification email delivery failed:", emailError);
            return res.status(503).json({
                message: "Your account was created, but the verification email could not be sent. Please request another email."
            });
        }

        return res.status(201).json({
            message: "Account created. Check your email to verify your address.",
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Registration failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const token = typeof req.body.token === "string"
            ? req.body.token
            : "";

        if (!token) {
            return res.status(400).json({
                message: "Verification token is required"
            });
        }

        const tokenHash = createHash("sha256").update(token).digest("hex");
        const user = await markEmailVerified(tokenHash);

        if (!user) {
            return res.status(400).json({
                message: "This verification link is invalid, expired, or already used."
            });
        }

        return res.status(200).json({
            message: "Email verified successfully"
        });
    } catch (error) {
        console.error("Email verification failed:", error);
        return res.status(500).json({
            message: "Unable to verify your email right now"
        });
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const genericResponse = {
            message: "If an unverified account exists for that email, a verification link will be sent."
        };
        const user = await findUserByEmail(email);

        if (!user || user.email_verified) {
            return res.status(200).json(genericResponse);
        }

        const token = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
        const savedUser = await saveEmailVerificationToken(
            user.id,
            tokenHash,
            expiresAt
        );

        if (!savedUser) {
            return res.status(200).json(genericResponse);
        }

        await deliverVerificationEmail(savedUser, token, tokenHash);

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Resend verification email failed:", error);
        return res.status(503).json({
            message: "If an unverified account exists for that email, a verification link will be sent. Please try again later."
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);

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

        const passwordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                message: "Verify your email address before signing in",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        const tokens = generateTokens(user);
        setAuthCookies(res, tokens);

        return res.status(200).json({
            message: "Login successful",
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Login failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        clearAuthCookies(res);

        return res.status(401).json({
            message: "Refresh token required"
        });
    }

    const decoded = verifyJwt(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
    );

    if (
        !decoded ||
        typeof decoded !== "object" ||
        !decoded.id ||
        !decoded.email
    ) {
        clearAuthCookies(res);

        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }

    try {
        const user = await findUserByEmail(
            normalizeEmail(decoded.email)
        );

        if (
            !user ||
            String(user.id) !== String(decoded.id) ||
            !user.email_verified
        ) {
            clearAuthCookies(res);

            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        const tokens = generateTokens(user);
        setAuthCookies(res, tokens);

        return res.status(200).json({
            message: "Token refreshed"
        });
    } catch (error) {
        console.error("Token refresh failed:", error);

        return res.status(500).json({
            message: "Unable to refresh session"
        });
    }
};

const logoutUser = async (req, res) => {
    clearAuthCookies(res);

    return res.status(200).json({
        message: "Logged out successfully"
    });
};

const getCurrentUser = async (req, res) => {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const decoded = verifyJwt(
        accessToken,
        process.env.JWT_ACCESS_SECRET
    );

    if (
        !decoded ||
        typeof decoded !== "object" ||
        !decoded.id ||
        !decoded.email
    ) {
        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }

    try {
        const user = await findUserByEmail(
            normalizeEmail(decoded.email)
        );

        if (
            !user ||
            String(user.id) !== String(decoded.id) ||
            !user.email_verified
        ) {
            return res.status(401).json({
                message: "Invalid access token"
            });
        }

        return res.status(200).json({
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Get current user failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getUserByEmail = async (req, res) => {
    try {
        const email = normalizeEmail(req.params.email);
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
        console.error("Get user failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const genericResponse = {
            message: "If an account exists for that email, password reset instructions will be sent."
        };

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(200).json(genericResponse);
        }

        const resetToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_RESET_SECRET,
            { expiresIn: "15m" }
        );

        const resetTokenHash = createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const savedToken = await setPasswordResetToken(
            user.id,
            resetTokenHash,
            expiresAt
        );

        if (!savedToken) {
            return res.status(500).json({
                message: "Internal server error"
            });
        }

        const frontendUrl = (
            process.env.FRONTEND_URL || "http://localhost:3000"
        ).replace(/\/+$/, "");

        const resetLink =
            `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

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

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Forgot password failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

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

        const decoded = verifyJwt(
            token,
            process.env.JWT_RESET_SECRET
        );

        if (
            !decoded ||
            typeof decoded !== "object" ||
            !decoded.id
        ) {
            return res.status(401).json({
                message: "Invalid or expired reset token"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const resetTokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        const updatedUser = await updateUserPassword(
            decoded.id,
            hashedPassword,
            resetTokenHash
        );

        if (!updatedUser) {
            return res.status(401).json({
                message: "Invalid, expired, or already used reset token"
            });
        }

        clearAuthCookies(res);

        return res.status(200).json({
            message: "Password reset successfully"
        });
    } catch (error) {
        console.error("Reset password failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const sendOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const genericResponse = {
            message: "If an account exists for that email, an OTP has been sent."
        };

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(200).json(genericResponse);
        }

        const otp = randomInt(100000, 1000000).toString();

        otpStore.set(email, {
            otpHash: createHash("sha256").update(otp).digest("hex"),
            expiresAt: Date.now() + OTP_TTL_MS,
            attempts: 0
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

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Send OTP failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp ?? "").trim();

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        const stored = otpStore.get(email);

        if (!stored) {
            return res.status(401).json({
                message: "OTP not found or expired"
            });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email);

            return res.status(401).json({
                message: "OTP expired"
            });
        }

        if (stored.attempts >= OTP_MAX_ATTEMPTS) {
            otpStore.delete(email);

            return res.status(429).json({
                message: "Too many attempts. Please request a new OTP."
            });
        }

        const otpHash = createHash("sha256").update(otp).digest("hex");

        if (!safeEqual(stored.otpHash, otpHash)) {
            stored.attempts += 1;

            if (stored.attempts >= OTP_MAX_ATTEMPTS) {
                otpStore.delete(email);

                return res.status(429).json({
                    message: "Too many attempts. Please request a new OTP."
                });
            }

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

        const tokens = generateTokens(user);
        setAuthCookies(res, tokens);

        return res.status(200).json({
            message: "OTP verified successfully",
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("OTP verification failed:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getCurrentUser,
    getUserByEmail,
    forgotPassword,
    resetPassword,
    sendOtp,
    verifyOtp
};
