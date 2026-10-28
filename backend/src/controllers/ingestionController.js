const { ingestRepository } = require("../services/ingestionService");

const ingestionController = async (req, res) => {
    try {
        const { repo_url, session_id } = req.body;

        if (session_id && typeof session_id !== "string") {
            return res.status(400).json({
                message: "Invalid session ID",
            });
        }

        if (!session_id && !repo_url) {
            return res.status(400).json({
                message: "Repository URL is required",
            });
        }

        if (!session_id) {
            let parsedUrl;

            try {
                parsedUrl = new URL(repo_url);
            } catch {
                return res.status(400).json({
                    message: "Invalid repository URL",
                });
            }

            if (
                parsedUrl.protocol !== "https:" ||
                parsedUrl.hostname !== "github.com"
            ) {
                return res.status(400).json({
                    message: "A valid HTTPS GitHub repository URL is required",
                });
            }
        }

        const result = await ingestRepository({
            userId: req.user.id,
            repo_url,
            sessionId: session_id
        });

        return res.status(200).json({
            message: "Repository ingestion completed",
            ...result,
        });
    } catch (error) {
        console.error("Ingestion controller error:", error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : "Repository ingestion failed",
            code: error.code || "INGESTION_ERROR",
        });
    }
};

module.exports = {
    ingestionController,
};