const app = require("./src/app");
const pool = require("./src/db/connection");

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
}

const start = async () => {
    await pool.query("SELECT 1");

    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });

    const shutdown = () => {
        server.close(async () => {
            await pool.end();
        });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    return server;
};

if (require.main === module) {
    start().catch(async (error) => {
        console.error("Backend startup failed:", error.message);
        await pool.end();
        process.exitCode = 1;
    });
}

module.exports = { start };