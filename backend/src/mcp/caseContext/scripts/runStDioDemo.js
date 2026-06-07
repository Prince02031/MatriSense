// MCP stdio demo launcher
// Run: npm run mcp:case (or node src/mcp/caseContext/scripts/runStDioDemo.js)
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error("Missing MONGODB_URI or MONGO_URI in .env");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.error("Connected to MongoDB for MCP stdio demo.");

    // The server.js handles stdio transport when invoked with --stdio.
    // This script is a convenience wrapper for manual testing.
    // For production stdio, use: npm run mcp:case
    const { mcpServer } = require('../server');
    const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("MatriSense Case Context MCP Server running on stdio (demo mode)");
}

main().catch((err) => {
    console.error("Failed to start MCP stdio demo:", err);
    process.exit(1);
});
