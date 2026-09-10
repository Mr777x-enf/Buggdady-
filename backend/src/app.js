const express = require("express");
const app = express(); 
const pool = require("./db/connection");
const userRoutes = require("./routes/userRoute");


app.use(express.json()); 
app.use("/api/users", userRoutes);

module.exports = app; 