const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const {
    chatController
} = require("../controllers/chatController");
const {
    getHistoryController,
    deleteHistoryController
} = require("../controllers/history.Controller");

const router = express.Router();

router.post("/", authenticate, chatController);
router.get("/history/:session_id", authenticate, getHistoryController);
router.delete("/history/:session_id", authenticate, deleteHistoryController);

module.exports = router;
