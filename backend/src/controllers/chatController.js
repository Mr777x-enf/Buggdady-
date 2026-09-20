const {
    createMessage,
    getSessionForUser
} = require("../models/history.model");


const chatController = async (req, res) => {

    try {

        const {
            session_id,
            question
        } = req.body;


        // 1. Validate request
        if (!session_id || !question) {

            return res.status(400).json({
                message: "Session ID and question are required"
            });
        }


        // 2. Get authenticated user
        const userId = req.user.id;


        // 3. Verify that the session belongs to the user
        const session = await getSessionForUser(
            session_id,
            userId
        );


        if (!session) {

            return res.status(403).json({
                message: "Invalid session"
            });
        }


        // 4. Save user's question
        await createMessage(
            session_id,
            "user",
            question
        );


        // 5. Send question to FastAPI
        const response = await fetch(
            "http://localhost:8000/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    session_id,
                    question
                })
            }
        );


        // 6. Check FastAPI response
        if (!response.ok) {

            console.error(
                "FastAPI error:",
                response.status
            );

            return res.status(502).json({
                message: "AI service failed"
            });
        }


        // 7. Get AI response
        const data = await response.json();

        const answer = data.answer;


        // 8. Validate AI response
        if (!answer) {

            return res.status(502).json({
                message: "Invalid response from AI service"
            });
        }


        // 9. Save AI answer
        await createMessage(
            session_id,
            "assistant",
            answer
        );


        // 10. Return answer to React
        return res.status(200).json({
            answer
        });

    } catch (error) {

        console.error(
            "Chat controller error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


module.exports = {
    chatController
};