const db = require("../db/connection");

const createRepository = async (userId, repoLink, sessionId) => {
    const result = await db.query(
        `
        INSERT INTO repositories (user_id, repo_link, session_id)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, repo_link, session_id, created_at
        `,
        [userId, repoLink, sessionId]
    );

    return result.rows[0];
};
