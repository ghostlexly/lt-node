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
const tmp_1 = __importDefault(require("tmp"));
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
    getTempDir = async () => {
        if (this.tempDir) {
            return this.tempDir;
        }
        const tempDir = tmp_1.default.dirSync({ unsafeCleanup: true }).name;
        this.tempDir = tempDir;
        return tempDir;
    };
    clearTempDir = async () => {
        const tempDir = await this.getTempDir();
        await promises_1.default.rm(tempDir, { recursive: true, force: true });
    };
    buildProject = async () => {
        try {
            const outputDir = await this.getOutputDir();
            const tempDir = await this.getTempDir();
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
            const compilerOptions = {
                ...parsedCommandLine.options,
                outDir: outputDir,
                noCheck: true,
                noEmit: false,
                emitDeclarationOnly: false,
                noEmitOnError: false,
                skipLibCheck: true,
                incremental: true,
            };
            const tempFileNames = await Promise.all(parsedCommandLine.fileNames.map(async (fileName) => {
                const content = await promises_1.default.readFile(fileName, "utf8");
                const tempFileName = path_1.default.join(tempDir, path_1.default.relative(this.sourceDir, fileName));
                const tempFileDir = path_1.default.dirname(tempFileName);
                if (!(0, fs_1.existsSync)(tempFileDir)) {
                    await promises_1.default.mkdir(tempFileDir, { recursive: true });
                }
                await promises_1.default.writeFile(tempFileName, `// @ts-nocheck\n${content}`);
                return tempFileName;
            }));
            const program = typescript_1.default.createProgram(tempFileNames, {
                ...compilerOptions,
            });
            program.emit();
        }
        catch (error) {
            throw error;
        }
        finally {
            await this.clearTempDir();
        }
    };
    async run(entryPoint) {
        await this.buildProject();
    }
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map