"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            : path_1.default.join(process.cwd(), "dist");
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
    async buildProjectWithSwc({ parsedTsConfig, }) {
        const { options: tsOptions, fileNames } = parsedTsConfig;
        const outputDir = await this.getOutputDir(tsOptions);
        const swcTarget = this.mapTarget(tsOptions.target ?? typescript_1.default.ScriptTarget.ES2022);
        const swcModule = this.mapModuleKind(tsOptions.module ?? typescript_1.default.ModuleKind.ESNext);
        const rootDir = tsOptions.rootDir ?? process.cwd();
        for (const tsFile of fileNames) {
            const relPath = path_1.default.relative(rootDir, tsFile);
            const outFile = path_1.default.join(outputDir, relPath.replace(/\.tsx?$/, ".js"));
            await promises_1.default.mkdir(path_1.default.dirname(outFile), { recursive: true });
            const { code, map } = await (0, core_1.transformFile)(tsFile, {
                jsc: {
                    parser: {
                        syntax: "typescript",
                        tsx: false,
                        decorators: !!tsOptions.experimentalDecorators,
                    },
                    target: swcTarget,
                    baseUrl: tsOptions.baseUrl,
                    paths: tsOptions.paths,
                },
                module: {
                    type: swcModule,
                },
                sourceMaps: true,
                minify: false,
                swcrc: false,
            });
            await promises_1.default.writeFile(outFile, code, "utf8");
            if (map) {
                await promises_1.default.writeFile(outFile + ".map", map, "utf8");
            }
        }
    }
    async run(entryPoint) {
        const parsedTsConfig = await this.getParsedCommandLine();
        const tsOptions = parsedTsConfig.options;
        const outputDir = await this.getOutputDir(tsOptions);
        const entryJs = path_1.default.join(outputDir, path_1.default.relative(process.cwd(), entryPoint).replace(/\.tsx?$/, ".js"));
        const entryPointIndex = process.argv.indexOf(entryPoint);
        const allArgs = process.argv.slice(entryPointIndex + 1);
        const execArgs = [];
        const scriptArgs = [];
        allArgs.forEach((arg) => {
            if (arg.startsWith("--")) {
                execArgs.push(arg);
            }
            else {
                scriptArgs.push(arg);
            }
        });
        await this.buildProjectWithSwc({ parsedTsConfig });
        console.log("LT-Node", "node args:", execArgs);
        console.log("LT-Node", "script args:", scriptArgs);
        const { spawn } = await Promise.resolve().then(() => __importStar(require("child_process")));
        const nodeProcess = spawn("node", [...execArgs, entryJs, ...scriptArgs], {
            stdio: "inherit",
            env: process.env,
        });
        return new Promise((resolve, reject) => {
            nodeProcess.on("exit", (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Process exited with code ${code}`));
                }
            });
            nodeProcess.on("error", (err) => {
                reject(err);
            });
        });
    }
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map