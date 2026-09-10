const express = require("express");

const {
    registerUser,
    getUserByEmail,loginUser,refreshAccessToken 
} = require("../controllers/userController");

const router = express.Router();

router.post("/register", registerUser);

router.get("/email/:email", getUserByEmail); 
router.post("/login",loginUser);
router.post("/refresh",refreshAccessToken)

module.exports = router;