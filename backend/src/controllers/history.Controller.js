const {
    getMessagesBySession,
    getSessionForUser,
    deleteMessagesBySession
} = require("../models/history.model");


const getHistoryController = async (req, res) => {

    try {

        const { session_id } = req.params;

        const userId = req.user.id;


        // Verify ownership
        const repository = await getSessionForUser(
            session_id,
            userId
        );


        if (!repository) {

            return res.status(403).json({
                message: "Invalid session"
            });
        }


        // Get messages
        const messages = await getMessagesBySession(
            session_id
        );


        return res.status(200).json({
            messages
        });


    } catch (error) {

        console.error(
            "Get history error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


const deleteHistoryController = async (req, res) => {

    try {

        const { session_id } = req.params;

        const userId = req.user.id;


        // Verify ownership
        const repository = await getSessionForUser(
            session_id,
            userId
        );


        if (!repository) {

            return res.status(403).json({
                message: "Invalid session"
            });
        }


        // Delete messages
        const deletedCount =
            await deleteMessagesBySession(
                session_id
            );


        return res.status(200).json({
            message: "Chat history deleted",
            deleted_count: deletedCount
        });


    } catch (error) {

        console.error(
            "Delete history error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


module.exports = {
    getHistoryController,
    deleteHistoryController
};