"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helper = void 0;
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
class Helper {
    asyncSpawn = (command, options = {}) => {
        return new Promise((resolve, reject) => {
            const childProcess = (0, child_process_1.spawn)(command, {
                shell: true,
                stdio: ["inherit", "inherit", "inherit"],
                ...options,
            });
            childProcess.on("exit", (code) => {
                if (code !== 0) {
                    reject(`Child process exited with code ${code}.`);
                }
                resolve(true);
            });
            childProcess.on("error", (error) => {
                reject(`Error on process spawn: ${error.message}.`);
            });
            process.on("SIGINT", () => {
                childProcess.kill();
            });
            process.on("exit", () => {
                childProcess.kill();
            });
        });
    };
    log = ({ message, type = "info", }) => {
        let typeTag = `info`;
        if (type === "error") {
            typeTag = `${chalk_1.default.red("error")}`;
        }
        console.log(`${chalk_1.default.green("[lt-node]")} - ${typeTag}: ${message}`);
    };
}
exports.helper = new Helper();
//# sourceMappingURL=helper.js.map