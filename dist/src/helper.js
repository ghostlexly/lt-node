"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helper = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Helper {
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