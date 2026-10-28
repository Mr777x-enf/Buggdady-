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

const setRepositoryIngestionStatus = async (
    repositoryId,
    status,
    commitSha = null
) => {
    const result = await db.query(
        `
        UPDATE repositories
        SET ingestion_status = $2,
            commit_sha = COALESCE($3, commit_sha)
        WHERE id = $1
        RETURNING id, session_id, commit_sha, ingestion_status
        `,
        [repositoryId, status, commitSha]
    );

    return result.rows[0];
};

const claimRepositoryForIngestion = async (repositoryId) => {
    const result = await db.query(
        `
        UPDATE repositories
        SET ingestion_status = 'indexing'
        WHERE id = $1
          AND ingestion_status IN ('pending', 'failed')
        RETURNING id, user_id, repo_link, session_id, commit_sha, ingestion_status
        `,
        [repositoryId]
    );

    return result.rows[0];
};

module.exports = {
    createRepository,
    setRepositoryIngestionStatus,
    claimRepositoryForIngestion
};