// Enable module aliases or env vars before startup if needed
require('dotenv').config();
const mongoose = require('mongoose');
const { CaseContextMcpServer } = require('../mcpServer');
const { StdioTransport } = require('../transports/stdio');

async function main() {
    if (!process.env.MONGO_URI) {
        console.error("Missing MONGO_URI in .env");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.error("Connected to MongoDB for MCP demo payload resolution.");

    const server = new CaseContextMcpServer();
    const transport = new StdioTransport(server);

    await transport.start();
}

main().catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
});
