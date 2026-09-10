const express = require("express");

const {
    registerUser,
    getUserByEmail
} = require("../controllers/userController");

const router = express.Router();

router.post("/register", registerUser);

router.get("/email/:email", getUserByEmail);

module.exports = router;