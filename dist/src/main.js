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
const child_process_1 = require("child_process");
const helper_1 = require("./helper");
class LtNode {
    tsconfigPath;
    parsedTsConfig;
    constructor(tsconfigPath = path_1.default.join(process.cwd(), "tsconfig.json")) {
        this.tsconfigPath = tsconfigPath;
    }
    async parseTsConfig() {
        const parsedCommandLine = typescript_1.default.getParsedCommandLineOfConfigFile(this.tsconfigPath, {}, {
            ...typescript_1.default.sys,
            onUnRecoverableConfigFileDiagnostic: (diag) => {
                throw new Error(typescript_1.default.flattenDiagnosticMessageText(diag.messageText, "\n"));
            },
        });
        if (!parsedCommandLine) {
            throw new Error(`Failed to parse ${this.tsconfigPath}`);
        }
        this.parsedTsConfig = parsedCommandLine;
        return parsedCommandLine;
    }
    async getOutputDir() {
        const { options: tsOptions } = this.parsedTsConfig;
        const outDir = tsOptions.outDir
            ? path_1.default.resolve(tsOptions.outDir)
            : path_1.default.join(process.cwd(), "dist");
        if (!(0, fs_1.existsSync)(outDir)) {
            await promises_1.default.mkdir(outDir, { recursive: true });
        }
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
        const { options: tsOptions, fileNames } = this.parsedTsConfig;
        const outputDir = await this.getOutputDir();
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
    async typeCheck() {
        await helper_1.helper
            .asyncSpawn(`tsc --noEmit -p ${this.tsconfigPath}`)
            .catch(() => {
            helper_1.helper.log({ message: "Type-checks failed !", type: "error" });
        });
    }
    async getArgs({ entryPoint }) {
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
        return { execArgs, scriptArgs };
    }
    async runNodeJs({ entryPoint }) {
        const outputDir = await this.getOutputDir();
        const entryJs = path_1.default.join(outputDir, path_1.default.relative(process.cwd(), entryPoint).replace(/\.tsx?$/, ".js"));
        const { execArgs, scriptArgs } = await this.getArgs({ entryPoint });
        const nodeProcess = (0, child_process_1.spawn)("node", [...execArgs, entryJs, ...scriptArgs], {
            stdio: "inherit",
            env: process.env,
        });
        return new Promise((resolve, reject) => {
            nodeProcess.on("exit", (code) => {
                if (code === 0 || code === null) {
                    resolve(true);
                }
                else {
                    reject(new Error(`Process exited with code ${code}`));
                }
            });
            nodeProcess.on("error", (err) => {
                reject(err);
            });
            process.on("SIGINT", () => {
                nodeProcess.kill();
            });
        });
    }
    async buildAndRun({ entryPoint }) {
        await this.buildProjectWithSwc();
        await this.runNodeJs({
            entryPoint,
        });
    }
    async run(entryPoint) {
        await this.parseTsConfig();
        await Promise.all([this.typeCheck(), this.buildAndRun({ entryPoint })]);
    }
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map