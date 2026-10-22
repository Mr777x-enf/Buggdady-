
const express = require("express");
const { ingestionController } = require("../controllers/ingestionController");

const router = express.Router();

router.post("/", ingestionController);

module.exports = router;
