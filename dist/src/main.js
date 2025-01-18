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
const core_1 = require("@swc/core");
class LtNode {
    outputDir;
    tsconfigPath;
    constructor(tsconfigPath = path_1.default.join(process.cwd(), "tsconfig.json")) {
        this.tsconfigPath = tsconfigPath;
    }
    async getParsedCommandLine() {
        const parsedCommandLine = typescript_1.default.getParsedCommandLineOfConfigFile(this.tsconfigPath, {}, {
            ...typescript_1.default.sys,
            onUnRecoverableConfigFileDiagnostic: (diag) => {
                throw new Error(typescript_1.default.flattenDiagnosticMessageText(diag.messageText, "\n"));
            },
        });
        if (!parsedCommandLine) {
            throw new Error(`Failed to parse ${this.tsconfigPath}`);
        }
        return parsedCommandLine;
    }
    async getOutputDir(tsOptions) {
        if (this.outputDir) {
            return this.outputDir;
        }
        const outDir = tsOptions.outDir
            ? path_1.default.resolve(tsOptions.outDir)
            : path_1.default.join(process.cwd(), ".ts-cache");
        if (!(0, fs_1.existsSync)(outDir)) {
            await promises_1.default.mkdir(outDir, { recursive: true });
        }
        this.outputDir = outDir;
        return outDir;
    }
    mapTarget(tsTarget) {
        switch (tsTarget) {
            case typescript_1.default.ScriptTarget.ES5:
                return "es5";
            case typescript_1.default.ScriptTarget.ES2015:
                return "es2015";
            case typescript_1.default.ScriptTarget.ES2016:
                return "es2016";
            case typescript_1.default.ScriptTarget.ES2017:
                return "es2017";
            case typescript_1.default.ScriptTarget.ES2018:
                return "es2018";
            case typescript_1.default.ScriptTarget.ES2019:
                return "es2019";
            case typescript_1.default.ScriptTarget.ES2020:
                return "es2020";
            case typescript_1.default.ScriptTarget.ES2021:
                return "es2021";
            case typescript_1.default.ScriptTarget.ES2022:
                return "es2022";
            default:
                return "es2022";
        }
    }
    mapModuleKind(tsModuleKind) {
        switch (tsModuleKind) {
            case typescript_1.default.ModuleKind.CommonJS:
                return "commonjs";
            default:
                return "es6";
        }
    }
    async buildProjectWithSwc() {
        const parsed = await this.getParsedCommandLine();
        const { fileNames, options } = parsed;
        const outDir = await this.getOutputDir(options);
        const swcTarget = this.mapTarget(options.target ?? typescript_1.default.ScriptTarget.ES2022);
        const swcModule = this.mapModuleKind(options.module ?? typescript_1.default.ModuleKind.ESNext);
        const rootDir = options.rootDir ?? process.cwd();
        for (const tsFile of fileNames) {
            const relPath = path_1.default.relative(rootDir, tsFile);
            const outFile = path_1.default.join(outDir, relPath.replace(/\.tsx?$/, ".js"));
            await promises_1.default.mkdir(path_1.default.dirname(outFile), { recursive: true });
            const { code, map } = await (0, core_1.transformFile)(tsFile, {
                jsc: {
                    parser: {
                        syntax: "typescript",
                        tsx: false,
                        decorators: !!options.experimentalDecorators,
                    },
                    target: swcTarget,
                },
                module: {
                    type: swcModule,
                },
                sourceMaps: true,
            });
            await promises_1.default.writeFile(outFile, code, "utf8");
            if (map) {
                await promises_1.default.writeFile(outFile + ".map", map, "utf8");
            }
        }
    }
    async run(entryPoint) {
        await this.buildProjectWithSwc();
    }
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map