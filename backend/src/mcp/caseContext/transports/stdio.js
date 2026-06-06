const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

class StdioTransport {
    constructor(mcpServer) {
        this.mcpServer = mcpServer;
        this.transport = new StdioServerTransport();
    }

    async start() {
        await this.mcpServer.getServerInstance().connect(this.transport);
        console.error("MatriSense Case Context MCP Server running on stdio");
    }
}

module.exports = { StdioTransport };
