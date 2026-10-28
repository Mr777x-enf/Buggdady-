const { randomUUID } = require("crypto");
const {
    createRepository,
    setRepositoryIngestionStatus,
    claimRepositoryForIngestion
} = require("../models/user.repo");
const { getSessionForUser } = require("../models/history.model");
const { postAiService } = require("./aiService");

const ingestRepository = async ({ userId, repo_url, sessionId }) => {
    let repository;
    let session_id = sessionId;

    if (session_id) {
        repository = await getSessionForUser(session_id, userId);
        if (!repository) {
            const error = new Error("Invalid session");
            error.statusCode = 403;
            error.code = "INVALID_SESSION";
            throw error;
        }

        repo_url = repository.repo_link;
    } else {
        session_id = randomUUID();
        repository = await createRepository(
            userId,
            repo_url,
            session_id
        );
    }

    const claimedRepository = await claimRepositoryForIngestion(
        repository.id
    );
    if (!claimedRepository) {
        const error = new Error(
            "Repository is already indexed or ingestion is in progress"
        );
        error.statusCode = 409;
        error.code = "INGESTION_ALREADY_CLAIMED";
        throw error;
    }

    try {
        const ingestion = await postAiService("api/ingest/", {
            repo_url,
            session_id,
            repository_id: String(repository.id)
        });

        if (
            ingestion.status !== "indexed" ||
            typeof ingestion.commit_sha !== "string" ||
            !ingestion.commit_sha
        ) {
            const error = new Error(
                "AI service did not confirm repository indexing"
            );
            error.statusCode = 502;
            error.code = "INGESTION_NOT_INDEXED";
            throw error;
        }

        const savedRepository = await setRepositoryIngestionStatus(
            repository.id,
            "indexed",
            ingestion.commit_sha
        );
        if (
            !savedRepository ||
            savedRepository.ingestion_status !== "indexed" ||
            savedRepository.commit_sha !== ingestion.commit_sha
        ) {
            throw new Error("Unable to persist repository indexing metadata");
        }

        return {
            session_id,
            repository_id: String(repository.id),
            status: ingestion.status,
            commit_sha: ingestion.commit_sha,
            file_count: ingestion.file_count,
            chunk_count: ingestion.chunk_count,
            repository: {
                id: claimedRepository.id,
                repo_link: claimedRepository.repo_link,
                session_id,
                commit_sha: ingestion.commit_sha,
                ingestion_status: ingestion.status
            },
            ingestion
        };
    } catch (error) {
        try {
            await setRepositoryIngestionStatus(repository.id, "failed");
        } catch (statusError) {
            console.error(
                "Unable to record failed repository ingestion:",
                statusError
            );
        }

        throw error;
    }
};

module.exports = {
    ingestRepository,
};