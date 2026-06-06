#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

const connectDB = require('./db');
const { getToolsList, executeTool } = require('./tools');

async function main() {
    await connectDB();

    const server = new Server(
        {
            name: "matrisense-referral-mcp",
            version: "1.0.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: getToolsList(),
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        return await executeTool(request.params.name, request.params.arguments);
    });

    server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
        await server.close();
        process.exit(0);
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("matrisense-referral-mcp server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
