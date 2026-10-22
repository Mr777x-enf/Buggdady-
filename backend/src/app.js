
const express = require("express");
const app = express();

const pool = require("./db/connection");
const userRoutes = require("./routes/userRoute");
const cookieParser = require("cookie-parser");
const chatRoutes = require("./routes/chatRoute");

app.use(cookieParser());
app.use(express.json());
app.use("/api/ingest", require("./routes/ingestionRoutes"));
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

module.exports = app;