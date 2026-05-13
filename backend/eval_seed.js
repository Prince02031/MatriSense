const fs = require('fs');
async function run() {
    try {
        require('./scripts/seedDemoData.js');
    } catch (e) {
        fs.writeFileSync('seed_crash.txt', e.stack);
    }
}
run();
