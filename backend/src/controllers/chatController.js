
const {
    createMessage,
    getSessionForUser
} = require("../models/history.model");

const {
    postAiService
} = require("../services/aiService");

const chatController = async (req, res) => {
    try {
        const { session_id, question } = req.body;

        if (!session_id || !question) {
            return res.status(400).json({
                message: "Session ID and question are required"
            });
        }

        const userId = 3;

        const session = await getSessionForUser(
            session_id,
            userId
        );

        if (!session) {
            return res.status(403).json({
                message: "Invalid session"
            });
        }

        await createMessage(
            session_id,
            "user",
            question
        );

        const data = await postAiService("api/chat/", {
            session_id,
            question
        });

        const answer = data.answer;

        if (!answer) {
            return res.status(502).json({
                message: "Invalid response from AI service"
            });
        }

        await createMessage(
            session_id,
            "assistant",
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