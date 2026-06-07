'use strict';
require('dotenv').config();

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { getStidoTransport, setupHttpTransport } = require('./transports');
const { toolsDef, executeToolWrapper } = require('./tools');

const ENABLE_REFERRAL_MCP = process.env.ENABLE_REFERRAL_MCP === 'true';

async function main() {
    if (!ENABLE_REFERRAL_MCP) {
        console.warn('[MCP Server] ENABLE_REFERRAL_MCP is false or missing. Exiting.');
        process.exit(0);
    }

    // Reuse existing mongoose connection if running standalone stdio, else if in Express it relies on app's connection.
    if (process.argv.includes('--stdio')) {
        const mongoose = require('mongoose');
        const connUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrisense';
        try {
            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(connUrl);
            }
        } catch (err) {
            console.error('[MCP Server] DB Error:', err);
            process.exit(1);
        }
    }

    const server = new Server(
        { name: "matrisense-referral-mcp", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: toolsDef };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        return await executeToolWrapper(request.params.name, request.params.arguments);
    });

    server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
        await server.close();
        process.exit(0);
    });

    if (process.argv.includes('--stdio')) {
        const ALLOW_STDIO = process.env.REFERRAL_MCP_ALLOW_STDIO_DEMO === 'true';
        if (!ALLOW_STDIO) {
            console.error('[MCP Server] Stdio demo mode strictly disabled by REFERRAL_MCP_ALLOW_STDIO_DEMO');
            process.exit(1);
        }

        let transport;
        try {
            transport = getStidoTransport();
            await server.connect(transport);
            console.error("matrisense-referral-mcp server running on stdio");
        } catch (err) {
            console.error(err);
        }
    } else {
        // If not stdio, assume it's attached via HTTP inside main Express app
        return server;
    }
}

if (require.main === module) {
    if (!process.env.ENABLE_REFERRAL_MCP) {
        process.env.ENABLE_REFERRAL_MCP = 'true'; // Force enable ONLY if executing directly via node CLI locally
    }
    main().catch(err => {
        console.error("Fatal error starting MCP Server:", err);
        process.exit(1);
    });
}

module.exports = { main };
