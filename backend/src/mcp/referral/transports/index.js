'use strict';
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

function getStidoTransport() {
    return new StdioServerTransport();
}

/**
 * Optionally hooks into the existing Express App.
 */
function setupHttpTransport(app) {
    const ENABLE_HTTP = process.env.REFERRAL_MCP_ENABLE_HTTP === 'true';
    if (!ENABLE_HTTP) {
        console.warn('[MCP Transport] HTTP disabled by default via config.');
        return;
    }

    const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
    let transport = null;

    // Health Auth Middleware
    const mcpAuth = (req, res, next) => {
        const token = req.headers['x-mcp-internal-token'] || req.query.internal_token;
        if (!token || token !== process.env.REFERRAL_MCP_INTERNAL_TOKEN) {
            return res.status(403).json({ ok: false, error: 'Forbidden. Missing or invalid internal token.' });
        }
        next();
    };

    app.get('/mcp/referral/health', mcpAuth, (req, res) => {
        res.json({
            ok: true,
            server: "matrisense-referral-mcp",
            tools: 15,
            transports: ["stdio", "http-if-enabled"],
            patientCanFinalizeReferral: false,
            decidesRisk: false
        });
    });

    app.get('/mcp/referral/sse', mcpAuth, async (req, res) => {
        transport = new SSEServerTransport("/mcp/referral/messages", res);
        await global.__mcpReferralServerContext?.connect(transport);
    });

    app.post('/mcp/referral/messages', mcpAuth, async (req, res) => {
        if (!transport) return res.status(400).json({ error: 'SSE not initialized' });
        await transport.handlePostMessage(req, res);
    });
}

module.exports = { getStidoTransport, setupHttpTransport };
