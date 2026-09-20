const { randomUUID } = require("crypto");

const {
    createRepository
} = require("../models/user.repo");


const createRepositoryController = async (req, res) => {
    try {

        const { repo_url } = req.body;

        // 1. Validate repository URL
        if (!repo_url) {
            return res.status(400).json({
                message: "Repository URL is required"
            });
        }

        // 2. Get authenticated user
        const userId = req.user.id;

        // 3. Create new session ID
        const sessionId = randomUUID();

        // 4. Save repository in database
        const repository = await createRepository(
            userId,
            repo_url,
            sessionId
        );

        // 5. Send repository information to FastAPI
        const response = await fetch(
            "http://localhost:8000/ingest",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    repo_url: repo_url,
                    session_id: sessionId
                })
            }
        );

        // 6. FastAPI failed
        if (!response.ok) {

            return res.status(502).json({
                message: "Failed to send repository to AI service"
            });
        }

        // 7. Success
        return res.status(201).json({
            message: "Repository added successfully",

            repository: {
                id: repository.id,
                repo_link: repository.repo_link,
                session_id: repository.session_id
            }
        });

    } catch (error) {

        console.error(
            "Create repository error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


module.exports = {
    createRepositoryController
};