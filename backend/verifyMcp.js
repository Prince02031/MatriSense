const { CaseContextMcpServer } = require("./src/mcp/caseContext/mcpServer");
const fs = require("fs");

async function runTest() {
    const mcp = new CaseContextMcpServer();
    const server = mcp.getServerInstance();

    console.log("Registered tools mapping check:");
    const tools = await server.requestHandler({ method: "tools/list", params: {} }, { send: () => { } });
    console.log(tools.tools.map(t => t.name));

    console.log("Successfully verified tool registration.");
    process.exit(0);
}

runTest().catch((err) => {
    fs.writeFileSync("err.log", err.stack || err.toString());
    process.exit(1);
});
