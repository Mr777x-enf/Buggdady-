
const express = require("express");
const app = express();

const pool = require("./db/connection");
const userRoutes = require("./routes/userRoute");
const cookieParser = require("cookie-parser");
const chatRoutes = require("./routes/chatRoute");
const frontendOrigin = new URL(
    process.env.FRONTEND_URL || "http://localhost:3000"
).origin;

app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
    const origin = req.get("Origin");

    if (origin === frontendOrigin) {
        res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
        return res.sendStatus(origin === frontendOrigin ? 204 : 403);
    }

    next();
});
app.use("/api/ingest", require("./routes/ingestionRoutes"));
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

module.exports = app;