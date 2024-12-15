import { LtNode } from "../main";
import path from "path";

const runner = new LtNode({
  cacheDir: path.join(process.cwd(), ".ts-cache"),
  sourceDir: process.cwd(),
});

runner.require("./src/tests/js/simple-console-log.js");
