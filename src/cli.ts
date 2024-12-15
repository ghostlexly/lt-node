#!/usr/bin/env node

import { LtNode } from "./main";
import * as path from "path";

const filename = process.argv[2];

if (!filename) {
  console.error("Please provide a file to run!");
  console.error("Usage: lt-node <filename>");
  process.exit(1);
}

const runner = new LtNode({
  cacheDir: path.join(process.cwd(), ".ts-cache"),
  sourceDir: process.cwd(),
});

runner.run(filename).catch((error) => {
  console.error("Error running file:", error);
  process.exit(1);
});
