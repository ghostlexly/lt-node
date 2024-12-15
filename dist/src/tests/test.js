"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("../main");
const path_1 = __importDefault(require("path"));
const runner = new main_1.LtNode({
    cacheDir: path_1.default.join(process.cwd(), ".ts-cache"),
    sourceDir: process.cwd(),
});
runner.require("./src/tests/js/simple-console-log.js");
//# sourceMappingURL=test.js.map