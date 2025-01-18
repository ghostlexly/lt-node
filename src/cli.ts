#!/usr/bin/env node

import { LtNode } from "./main";

async function main() {
  const bootstrapTime = performance.now();
  const filename = process.argv[2];

  if (!filename) {
    console.error("Please provide a file to run!");
    console.error("Usage: lt-node <filename>");
    process.exit(1);
  }

  const runner = new LtNode();
  await runner.run(filename);

  const buildTime = performance.now() - bootstrapTime;
  console.log(`Build time: ${buildTime.toFixed(2)}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
