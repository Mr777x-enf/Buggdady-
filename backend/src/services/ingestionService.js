const { randomUUID } = require("crypto");
const { createRepository } = require("../models/user.repo");
const { postAiService } = require("./aiService");

const ingestRepository = async ({ userId, repo_url }) => {
    // 1. Generate a session ID
    const session_id = randomUUID();

    // 2. Create and save the repository in the database
    const repository = await createRepository(
        userId,
        repo_url,
        session_id
    );

    // 3. Send repository details to FastAPI
    const ingestion = await postAiService("api/ingest/", {
        repo_url,
        session_id,
        repository_id: String(repository.id),
    });

    // 4. Return both results
    return {
        repository: {
            id: repository.id,
            repo_link: repository.repo_link,
            session_id: repository.session_id,
        },
        ingestion,
    };
};

module.exports = {
    ingestRepository,
};