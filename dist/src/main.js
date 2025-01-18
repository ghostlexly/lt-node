"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LtNode = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const glob_1 = require("glob");
const typescript_1 = __importDefault(require("typescript"));
const core_1 = require("@swc/core");
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
const chokidar_1 = __importDefault(require("chokidar"));
const chalk_1 = __importDefault(require("chalk"));
class LtNode {
    tsconfigPath;
    parsedTsConfig;
    isWatching = false;
    isNoCheck = false;
    currentNodeProcess = null;
    constructor(tsconfigPath = path_1.default.join(process.cwd(), "tsconfig.json")) {
        this.tsconfigPath = tsconfigPath;
    }
    parseTsConfig = async () => {
        if (!(0, fs_1.existsSync)(this.tsconfigPath)) {
            this.parsedTsConfig = {
                options: {
                    target: typescript_1.default.ScriptTarget.ES2020,
                    module: typescript_1.default.ModuleKind.CommonJS,
                    outDir: path_1.default.join(process.cwd(), "dist"),
                    rootDir: process.cwd(),
                },
                fileNames: await (0, glob_1.glob)("**/*.ts", {
                    ignore: ["**/node_modules/**"],
                    cwd: process.cwd(),
                }),
                errors: [],
            };
            return this.parsedTsConfig;
        }
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
    };
    getOutputDir = async () => {
        const { options: tsOptions } = this.parsedTsConfig;
        const outDir = tsOptions.outDir
            ? path_1.default.resolve(tsOptions.outDir)
            : path_1.default.join(process.cwd(), "dist");
        if (!(0, fs_1.existsSync)(outDir)) {
            await promises_1.default.mkdir(outDir, { recursive: true });
        }
        return outDir;
    };
    mapTarget = (tsTarget) => {
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
    };
    mapModuleKind = (tsModuleKind) => {
        switch (tsModuleKind) {
            case typescript_1.default.ModuleKind.CommonJS:
                return "commonjs";
            default:
                return "es6";
        }
    };
    buildProjectWithSwc = async () => {
        const { options: tsOptions, fileNames } = this.parsedTsConfig;
        const outputDir = await this.getOutputDir();
        const rootDir = tsOptions.rootDir ?? process.cwd();
        const swcTarget = this.mapTarget(tsOptions.target ?? typescript_1.default.ScriptTarget.ES2022);
        const swcModule = this.mapModuleKind(tsOptions.module ?? typescript_1.default.ModuleKind.ESNext);
        await Promise.all(fileNames.map(async (tsFile) => {
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
            return Promise.all([
                promises_1.default.writeFile(outFile, code, "utf8"),
                map ? promises_1.default.writeFile(outFile + ".map", map, "utf8") : Promise.resolve(),
            ]);
        }));
    };
    typeCheck = () => {
        return new Promise((resolve) => {
            const program = typescript_1.default.createProgram({
                rootNames: this.parsedTsConfig.fileNames,
                options: this.parsedTsConfig.options,
            });
            const diagnostics = [
                ...program.getSemanticDiagnostics(),
                ...program.getSyntacticDiagnostics(),
            ];
            if (diagnostics.length > 0) {
                const formatHost = {
                    getCanonicalFileName: (path) => path,
                    getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
                    getNewLine: () => typescript_1.default.sys.newLine,
                };
                const output = typescript_1.default.formatDiagnosticsWithColorAndContext(diagnostics, formatHost);
                process.stderr.write(output);
                resolve(false);
            }
            resolve(true);
        });
    };
    copyNonTsFiles = async () => {
        const { options: tsOptions } = this.parsedTsConfig;
        const outputDir = await this.getOutputDir();
        const rootDir = tsOptions.rootDir ?? process.cwd();
        const nonTsFiles = await (0, glob_1.glob)("**/*", {
            ignore: ["**/*.{ts,tsx,js,jsx}", "**/node_modules/**", outputDir + "/**"],
            nodir: true,
            cwd: rootDir,
        });
        for (const file of nonTsFiles) {
            const sourcePath = path_1.default.join(rootDir, file);
            const destPath = path_1.default.join(outputDir, file);
            await promises_1.default.mkdir(path_1.default.dirname(destPath), { recursive: true });
            await promises_1.default.copyFile(sourcePath, destPath);
        }
    };
    getArgs = ({ entryPoint }) => {
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
    };
    stopNodeProcess = async () => {
        try {
            await new Promise((resolve, reject) => {
                if (!this.currentNodeProcess) {
                    resolve(true);
                    return;
                }
                const timeout = setTimeout(() => {
                    reject(new Error("Server shutdown timed out after 5000ms"));
                }, 5000);
                this.currentNodeProcess.on("close", () => {
                    clearTimeout(timeout);
                    this.currentNodeProcess = null;
                    console.log("Previous server process terminated");
                    resolve(true);
                });
                this.currentNodeProcess.kill("SIGTERM");
            });
        }
        catch (error) {
            this.currentNodeProcess?.kill("SIGKILL");
            this.currentNodeProcess = null;
            throw error;
        }
    };
    runNodeJs = async ({ entryPoint }) => {
        const outputDir = await this.getOutputDir();
        const entryJs = path_1.default.join(outputDir, path_1.default.relative(process.cwd(), entryPoint).replace(/\.tsx?$/, ".js"));
        if (this.currentNodeProcess) {
            await this.stopNodeProcess();
        }
        const { execArgs, scriptArgs } = this.getArgs({ entryPoint });
        this.currentNodeProcess = (0, child_process_1.spawn)("node", [...execArgs, entryJs, ...scriptArgs], {
            stdio: "inherit",
            env: process.env,
        });
        return new Promise((resolve, reject) => {
            this.currentNodeProcess.on("exit", (code) => {
                if (!this.isWatching) {
                    if (code === 0 || code === null) {
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Process exited with code ${code}`));
                    }
                }
            });
            this.currentNodeProcess.on("error", (err) => {
                if (!this.isWatching) {
                    reject(err);
                }
            });
        });
    };
    buildAndRun = async (entryPoint) => {
        try {
            await Promise.all([this.copyNonTsFiles(), this.buildProjectWithSwc()]);
            if (!this.isNoCheck) {
                setTimeout(() => {
                    this.typeCheck().then((passed) => {
                        if (!passed) {
                            logger_1.logger.log({
                                type: "error",
                                message: "Type-check failed - see errors above.",
                            });
                        }
                    });
                }, 0);
            }
        }
        catch (error) {
            logger_1.logger.log({
                type: "error",
                message: String(error),
            });
        }
    };
    watchFiles = async (entryPoint) => {
        const rootDir = this.parsedTsConfig.options.rootDir ?? process.cwd();
        const outputDir = await this.getOutputDir();
        const watcher = chokidar_1.default.watch(rootDir, {
            ignored: (watchPath, stats) => {
                if (watchPath.includes(outputDir)) {
                    return true;
                }
                return false;
            },
            persistent: true,
            usePolling: process.platform === "darwin",
            atomic: true,
            ignoreInitial: true,
        });
        watcher.on("change", async (filename) => {
            logger_1.logger.log({
                type: "info",
                message: `File changed: ${chalk_1.default.yellow(filename)}. Rebuilding...`,
            });
            await this.buildAndRun(entryPoint);
        });
        process.on("SIGINT", () => {
            watcher.close();
        });
        logger_1.logger.log({
            type: "info",
            message: "Watching for file changes...",
        });
    };
    run = async (entryPoint) => {
        const { execArgs } = this.getArgs({ entryPoint });
        this.isWatching = execArgs.includes("--watch");
        this.isNoCheck = execArgs.includes("--noCheck");
        await this.parseTsConfig();
        if (this.isWatching) {
            this.watchFiles(entryPoint);
        }
    };
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map