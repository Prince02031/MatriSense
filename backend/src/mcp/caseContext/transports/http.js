const express = require("express");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");

function createMcpRouter(mcpServer) {
    const router = express.Router();

    router.get("/health", (req, res) => {
        res.json({
            ok: true,
            server: "matrisense-case-context-mcp",
            tools: [
                "case_get_triage_profile_context",
                "case_get_current_triage",
                "case_get_guided_care_context",
                "case_get_recent_triage_history",
                "case_get_patient_visible_status",
                "case_get_health_worker_case_summary"
            ],
            transports: ["stdio", "http-if-enabled"],
            exposesRawDocuments: false, // Strongly enforced by service layer explicitly avoiding blob exposure
            decidesRisk: false
        });
    });

    router.use((req, res, next) => {
        const internalToken = process.env.CASE_MCP_INTERNAL_TOKEN;
        const providedToken = req.headers["case-mcp-internal-token"] || req.headers["authorization"]?.replace('Bearer ', '');

        // In production, force token requirement
        if (process.env.NODE_ENV === 'production' && (!internalToken || providedToken !== internalToken)) {
            return res.status(403).json({ error: "Access Denied. MCP HTTP endpoint is protected by CASE_MCP_INTERNAL_TOKEN in production." });
        }

        // In non-prod, if token is configured, enforce it anyway
        if (internalToken && providedToken !== internalToken) {
            return res.status(403).json({ error: "Access Denied. Invalid MCP Token." });
        }

        next();
    });

    let transport;

    router.get("/", async (req, res) => {
        transport = new SSEServerTransport("/mcp/case/messages", res);
        await mcpServer.connect(transport);
    });

    router.post("/messages", async (req, res) => {
        if (!transport) {
            return res.status(400).json({ error: "SSE Transport not initialized. Establish SSE connection via GET / first." });
        }
        await transport.handlePostMessage(req, res);
    });

    return router;
}

module.exports = { createMcpRouter };
