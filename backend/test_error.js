process.on('uncaughtException', (err) => {
    require('fs').writeFileSync('err.log', err.stack);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    require('fs').writeFileSync('err.log', err.stack);
    process.exit(1);
});
try {
    require("./verifyMcp.js");
} catch (err) {
    require('fs').writeFileSync('err.log', err.stack);
    process.exit(1);
}
