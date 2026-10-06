const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const {
    createRepositoryController
} = require("../controllers/repoController");

const router = express.Router();

router.post("/", authenticate, createRepositoryController);

module.exports = router;
