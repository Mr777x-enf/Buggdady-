const db = require("../db/connection");

const createUser = async (name, email, password) => {
    const result = await db.query(
        `INSERT INTO users (name, email, password, email_verified)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id, name, email, email_verified, created_at`,
        [name, email, password]
    );

    return result.rows[0];
};

const findUserByEmail = async (email) => {
    const result = await db.query(
        `SELECT id, name, email, password, email_verified
         FROM users
         WHERE email = $1`,
        [email]
    );

    return result.rows[0];
};

const saveEmailVerificationToken = async (
    userId,
    tokenHash,
    expiresAt,
    bypassRateLimit = false
) => {
    const result = await db.query(
        `
        UPDATE users
        SET email_verification_token_hash = $2,
            email_verification_expires = $3,
            email_verification_sent_at = NOW()
        WHERE id = $1
          AND email_verified = FALSE
          AND (
              $4::boolean
              OR email_verification_sent_at IS NULL
              OR email_verification_sent_at <= NOW() - INTERVAL '1 minute'
          )
        RETURNING id, name, email
        `,
        [userId, tokenHash, expiresAt, bypassRateLimit]
    );

    return result.rows[0];
};

const markEmailVerified = async (tokenHash) => {
    const result = await db.query(
        `
        UPDATE users
        SET email_verified = TRUE,
            email_verification_token_hash = NULL,
            email_verification_expires = NULL,
            email_verification_sent_at = NULL
        WHERE email_verification_token_hash = $1
          AND email_verification_expires > NOW()
          AND email_verified = FALSE
        RETURNING id, name, email, email_verified
        `,
        [tokenHash]
    );

    return result.rows[0];
};

const clearEmailVerificationSentAt = async (userId, tokenHash) => {
    await db.query(
        `
        UPDATE users
        SET email_verification_sent_at = NULL
        WHERE id = $1
          AND email_verification_token_hash = $2
          AND email_verified = FALSE
        `,
        [userId, tokenHash]
    );
};

const setPasswordResetToken = async (userId, tokenHash, expiresAt) => {
    const result = await db.query(
        `UPDATE users
         SET reset_password_token = $1, reset_password_expires = $2
         WHERE id = $3
         RETURNING id`,
        [tokenHash, expiresAt, userId]
    );

    return result.rowCount === 1;
};

const updateUserPassword = async (userId, hashedPassword, tokenHash) => {
    const result = await db.query(
        `
        UPDATE users
        SET password = $1,
            reset_password_token = NULL,
            reset_password_expires = NULL
        WHERE id = $2
          AND reset_password_token = $3
          AND reset_password_expires > NOW()
        RETURNING id, name, email
        `,
        [hashedPassword, userId, tokenHash]
    );

    return result.rows[0];
};



module.exports = {
    createUser,
    findUserByEmail,
    saveEmailVerificationToken,
    markEmailVerified,
    clearEmailVerificationSentAt,
    setPasswordResetToken,
    updateUserPassword
};