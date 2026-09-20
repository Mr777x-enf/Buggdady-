const db = require("../db/connection");


// Create a new message
const createMessage = async (sessionId, role, content) => {

    const result = await db.query(
        `
        INSERT INTO messages
        (session_id, role, content)
        VALUES ($1, $2, $3)
        RETURNING
            id,
            session_id,
            role,
            content,
            created_at
        `,
        [sessionId, role, content]
    );

    return result.rows[0];
};


// Get all messages of a session
const getMessagesBySession = async (sessionId) => {

    const result = await db.query(
        `
        SELECT
            id,
            session_id,
            role,
            content,
            created_at
        FROM messages
        WHERE session_id = $1
        ORDER BY created_at ASC
        `,
        [sessionId]
    );

    return result.rows;
};


// Delete all messages of a session
const deleteMessagesBySession = async (sessionId) => {

    const result = await db.query(
        `
        DELETE FROM messages
        WHERE session_id = $1
        RETURNING id
        `,
        [sessionId]
    );

    return result.rowCount;
};


// Check whether session belongs to user
const getSessionForUser = async (sessionId, userId) => {

    const result = await db.query(
        `
        SELECT
            id,
            user_id,
            repo_link,
            session_id
        FROM repositories
        WHERE session_id = $1
        AND user_id = $2
        `,
        [sessionId, userId]
    );

    return result.rows[0];
};


module.exports = {
    createMessage,
    getMessagesBySession,
    deleteMessagesBySession,
    getSessionForUser
};