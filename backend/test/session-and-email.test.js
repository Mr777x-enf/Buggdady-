const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const test = require("node:test");

function installMock(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    const previous = require.cache[resolved];
    require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports
    };

    return () => {
        if (previous) {
            require.cache[resolved] = previous;
        } else {
            delete require.cache[resolved];
        }
    };
}

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        cookies: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        cookie(...args) {
            this.cookies.push(args);
            return this;
        }
    };
}

const history = {
    session: {
        id: 17,
        ingestion_status: "indexed",
        commit_sha: "commit-from-db"
    },
    getSessionForUser: async (_sessionId, userId) =>
        userId === 8 ? history.session : undefined,
    createMessagePair: async (...args) => {
        history.savedPair = args;
    }
};
let aiPayload;
const restoreHistory = installMock("../src/models/history.model", history);
const restoreAi = installMock("../src/services/aiService", {
    postAiService: async (_endpoint, payload) => {
        aiPayload = payload;
        return { answer: "A repository-scoped answer" };
    }
});
const { chatController } = require("../src/controllers/chatController");

const userModel = {
    createUser: async (name, email) => ({ id: 5, name, email }),
    findUserByEmail: async () => null,
    saveEmailVerificationToken: async (...args) => {
        userModel.savedVerification = args;
        return { id: 5, name: "Test User", email: "test@example.com" };
    },
    markEmailVerified: async (tokenHash) => {
        userModel.verifiedHash = tokenHash;
        return userModel.verificationAccepted
            ? { id: 5, name: "Test User", email: "test@example.com" }
            : undefined;
    },
    clearEmailVerificationSentAt: async () => {},
    setPasswordResetToken: async () => true,
    updateUserPassword: async () => undefined
};
let sentEmail;
const restoreUserModel = installMock("../src/models/user.model", userModel);
const restoreEmail = installMock("../src/services/email", async (...args) => {
    sentEmail = args;
});
const { registerUser, verifyEmail } = require("../src/controllers/userController");

test("ingestion returns backend session metadata only after indexing is persisted", async () => {
    const repository = {
        id: 17,
        repo_link: "https://github.com/owner/repository"
    };
    let storedSessionId;
    const persistedStatuses = [];
    const restoreRepository = installMock("../src/models/user.repo", {
        createRepository: async (_userId, _repoLink, sessionId) => {
            storedSessionId = sessionId;
            return { ...repository, session_id: sessionId };
        },
        claimRepositoryForIngestion: async (repositoryId) => ({
            ...repository,
            id: repositoryId,
            session_id: storedSessionId
        }),
        setRepositoryIngestionStatus: async (_id, status, commitSha) => {
            persistedStatuses.push({ status, commitSha });
            return {
                id: repository.id,
                ingestion_status: status,
                commit_sha: commitSha
            };
        }
    });
    const restoreAiService = installMock("../src/services/aiService", {
        postAiService: async (_endpoint, payload) => ({
            session_id: payload.session_id,
            repository_id: payload.repository_id,
            commit_sha: "indexed-commit",
            file_count: 3,
            chunk_count: 7,
            status: "indexed"
        })
    });
    const servicePath = require.resolve("../src/services/ingestionService");
    delete require.cache[servicePath];

    try {
        const { ingestRepository } = require("../src/services/ingestionService");
        const result = await ingestRepository({
            userId: 8,
            repo_url: repository.repo_link
        });

        assert.equal(result.repository_id, "17");
        assert.equal(result.session_id, storedSessionId);
        assert.match(result.session_id, /^[0-9a-f-]{36}$/);
        assert.equal(result.commit_sha, "indexed-commit");
        assert.equal(result.chunk_count, 7);
        assert.equal(result.status, "indexed");
        assert.deepEqual(persistedStatuses, [
            { status: "indexed", commitSha: "indexed-commit" }
        ]);
    } finally {
        delete require.cache[servicePath];
        restoreRepository();
        restoreAiService();
    }
});

test("reindexing an owned legacy session uses its stored repository and keeps its ID", async () => {
    const storedRepository = {
        id: 21,
        user_id: 8,
        repo_link: "https://github.com/trusted-owner/trusted-repo",
        session_id: "legacy-session",
        ingestion_status: "pending"
    };
    let aiPayloadForReindex;
    const restoreHistoryModel = installMock("../src/models/history.model", {
        getSessionForUser: async (sessionId, userId) =>
            sessionId === storedRepository.session_id && userId === 8
                ? storedRepository
                : undefined
    });
    const restoreRepository = installMock("../src/models/user.repo", {
        createRepository: async () => {
            throw new Error("Reindex must not create another repository");
        },
        claimRepositoryForIngestion: async (repositoryId) => ({
            ...storedRepository,
            id: repositoryId,
            ingestion_status: "indexing"
        }),
        setRepositoryIngestionStatus: async (_id, status, commitSha) => ({
            ...storedRepository,
            ingestion_status: status,
            commit_sha: commitSha
        })
    });
    const restoreAiService = installMock("../src/services/aiService", {
        postAiService: async (_endpoint, payload) => {
            aiPayloadForReindex = payload;
            return {
                status: "indexed",
                commit_sha: "new-commit",
                file_count: 2,
                chunk_count: 4
            };
        }
    });
    const servicePath = require.resolve("../src/services/ingestionService");
    delete require.cache[servicePath];

    try {
        const { ingestRepository } = require("../src/services/ingestionService");
        const result = await ingestRepository({
            userId: 8,
            sessionId: storedRepository.session_id,
            repo_url: "https://github.com/attacker/other-repo"
        });

        assert.deepEqual(aiPayloadForReindex, {
            repo_url: storedRepository.repo_link,
            session_id: storedRepository.session_id,
            repository_id: String(storedRepository.id)
        });
        assert.equal(result.session_id, storedRepository.session_id);
        assert.equal(result.commit_sha, "new-commit");
    } finally {
        delete require.cache[servicePath];
        restoreHistoryModel();
        restoreRepository();
        restoreAiService();
    }
});

test("chat resolves repository and commit from the authenticated session", async () => {
    const response = createResponse();

    await chatController(
        {
            body: { session_id: "session-a", question: "Why does this fail?" },
            user: { id: 8 }
        },
        response
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(aiPayload, {
        session_id: "session-a",
        question: "Why does this fail?",
        repository_id: "17",
        commit_sha: "commit-from-db"
    });
    assert.deepEqual(history.savedPair, [
        "session-a",
        "Why does this fail?",
        "A repository-scoped answer"
    ]);
});

test("chat rejects a session that does not belong to the authenticated user", async () => {
    const response = createResponse();
    aiPayload = undefined;

    await chatController(
        {
            body: { session_id: "another-user-session", question: "Read this" },
            user: { id: 9 }
        },
        response
    );

    assert.equal(response.statusCode, 403);
    assert.equal(aiPayload, undefined);
});

test("registration stores only a hashed verification token and does not sign in", async () => {
    sentEmail = undefined;
    const response = createResponse();

    await registerUser(
        {
            body: {
                name: "Test User",
                email: "TEST@example.com",
                password: "password123"
            }
        },
        response
    );

    const verificationUrl = sentEmail[2].match(/https?:\/\/\S+/)[0];
    const token = new URL(verificationUrl).searchParams.get("token");
    const expectedHash = createHash("sha256").update(token).digest("hex");

    assert.equal(response.statusCode, 201);
    assert.equal(userModel.savedVerification[1], expectedHash);
    assert.notEqual(userModel.savedVerification[1], token);
    assert.equal(response.cookies.length, 0);
});

test("email verification accepts a token once and rejects invalid, expired, or reused tokens", async () => {
    userModel.verificationAccepted = true;
    const validResponse = createResponse();

    await verifyEmail(
        { body: { token: "single-use-token" } },
        validResponse
    );

    assert.equal(validResponse.statusCode, 200);
    assert.equal(
        userModel.verifiedHash,
        createHash("sha256").update("single-use-token").digest("hex")
    );

    userModel.verificationAccepted = false;
    for (const token of ["invalid-token", "expired-token", "single-use-token"]) {
        const response = createResponse();
        await verifyEmail({ body: { token } }, response);
        assert.equal(response.statusCode, 400);
    }
});

test("verification persistence enforces expiration, unused-token state, and resend throttling", async () => {
    const userModelPath = require.resolve("../src/models/user.model");
    const mockedUserModel = require.cache[userModelPath];
    delete require.cache[userModelPath];

    const statements = [];
    const restoreDatabase = installMock("../src/db/connection", {
        query: async (sql, values) => {
            statements.push({ sql, values });
            return { rows: [] };
        }
    });

    try {
        const persistentUserModel = require("../src/models/user.model");
        await persistentUserModel.createUser("Test User", "test@example.com", "hash");
        await persistentUserModel.markEmailVerified("token-hash");
        await persistentUserModel.saveEmailVerificationToken(
            5,
            "new-token-hash",
            new Date(),
            false
        );
    } finally {
        delete require.cache[userModelPath];
        if (mockedUserModel) require.cache[userModelPath] = mockedUserModel;
        restoreDatabase();
    }

    assert.match(statements[0].sql, /email_verified\)\s+VALUES \(\$1, \$2, \$3, FALSE\)/);
    assert.match(statements[1].sql, /email_verification_expires > NOW\(\)/);
    assert.match(statements[1].sql, /email_verified = FALSE/);
    assert.match(statements[1].sql, /email_verification_token_hash = NULL/);
    assert.match(
        statements[2].sql,
        /email_verification_sent_at <= NOW\(\) - INTERVAL '1 minute'/
    );
    assert.equal(statements[2].values[3], false);
});

test.after(() => {
    restoreHistory();
    restoreAi();
    restoreUserModel();
    restoreEmail();
});
