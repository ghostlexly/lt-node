#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
async function main() {
    const bootstrapTime = performance.now();
    const filename = process.argv[2];
    if (!filename) {
        console.error("Please provide a file to run!");
        console.error("Usage: lt-node <filename>");
        process.exit(1);
    }
    const runner = new main_1.LtNode();
    await runner.run(filename);
    console.log(`Build time: ${performance.now() - bootstrapTime}ms`);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map