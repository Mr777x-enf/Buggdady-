
const {
    createMessagePair,
    getSessionForUser
} = require("../models/history.model");

const {
    postAiService
} = require("../services/aiService");

const chatController = async (req, res) => {
    try {
        const { session_id, question } = req.body;

        if (
            typeof session_id !== "string" ||
            !session_id ||
            typeof question !== "string" ||
            !question.trim()
        ) {
            return res.status(400).json({
                message: "Session ID and question are required"
            });
        }

        const userId = req.user.id;

        const session = await getSessionForUser(
            session_id,
            userId
        );

        if (!session) {
            return res.status(403).json({
                message: "Invalid session"
            });
        }

        if (
            session.ingestion_status !== "indexed" ||
            !session.commit_sha
        ) {
            return res.status(409).json({
                message: "Repository ingestion is not complete"
            });
        }

        const data = await postAiService("api/chat/", {
            session_id,
            question,
            repository_id: String(session.id),
            commit_sha: session.commit_sha
        });

        const answer = data.answer;

        if (!answer) {
            return res.status(502).json({
                message: "Invalid response from AI service"
            });
        }

        await createMessagePair(
            session_id,
            question,
            answer
        );

        return res.status(200).json({
            answer
        });

    } catch (error) {
        console.error("Chat controller error:", error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : "Internal server error",
            code: error.code || "INTERNAL_SERVER_ERROR"
        });
    }
};

module.exports = {
    chatController
};