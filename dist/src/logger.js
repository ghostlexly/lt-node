"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    log = ({ message, type = "info", }) => {
        let typeTag = `info`;
        if (type === "error") {
            typeTag = `${chalk_1.default.red("error")}`;
        }
        else if (type === "info") {
            typeTag = `${chalk_1.default.yellow("info")}`;
        }
        console.log(`${chalk_1.default.green("[lt-node]")} - ${typeTag}: ${message}`);
    };
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map