"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LtNode = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const typescript_1 = __importDefault(require("typescript"));
class LtNode {
    outputDir;
    tempDir;
    sourceDir;
    constructor(options = {}) {
        this.sourceDir = process.cwd();
    }
    getOutputDir = async () => {
        if (this.outputDir) {
            return this.outputDir;
        }
        const outputDir = path_1.default.join(this.sourceDir, ".ts-cache");
        if (!(0, fs_1.existsSync)(outputDir)) {
            await promises_1.default.mkdir(outputDir, { recursive: true });
        }
        this.outputDir = outputDir;
        return outputDir;
    };
    buildProject = async () => {
        try {
            const configPath = path_1.default.join(process.cwd(), "tsconfig.json");
            const parsedCommandLine = typescript_1.default.getParsedCommandLineOfConfigFile(configPath, {}, {
                ...typescript_1.default.sys,
                onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                    throw new Error(typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
                },
            });
            if (!parsedCommandLine) {
                throw new Error(`Failed to parse tsconfig at ${configPath}`);
            }
            const outputDir = parsedCommandLine.options.outDir;
            const programNoTypes = typescript_1.default.createProgram(parsedCommandLine.fileNames, {
                ...parsedCommandLine.options,
                noEmit: false,
                emitDeclarationOnly: false,
                noEmitOnError: false,
                skipLibCheck: true,
                incremental: true,
                noCheck: true,
            });
            programNoTypes.emit();
        }
        catch (error) {
            throw error;
        }
    };
    async run(entryPoint) {
        await this.buildProject();
    }
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map