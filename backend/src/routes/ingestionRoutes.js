
const express = require("express");
const { ingestionController } = require("../controllers/ingestionController");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authenticate, ingestionController);

module.exports = router;
