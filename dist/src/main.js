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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LtNode = void 0;
const esbuild = __importStar(require("esbuild"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const get_tsconfig_1 = require("get-tsconfig");
class LtNode {
    cacheDir;
    sourceDir;
    tsconfig;
    pathsMatcher;
    constructor(options = {}) {
        this.sourceDir = process.cwd();
        this.cacheDir = options.cacheDir || path.join(this.sourceDir, ".ts-cache");
        this.tsconfig = (0, get_tsconfig_1.getTsconfig)(this.sourceDir);
        if (!this.tsconfig) {
            throw new Error("No tsconfig.json found");
        }
        this.pathsMatcher = (0, get_tsconfig_1.createPathsMatcher)(this.tsconfig);
        this.ensureCacheDir();
    }
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    async buildProject() {
        const tsFiles = await (0, glob_1.glob)("**/*.{ts,tsx}", {
            cwd: this.sourceDir,
            ignore: ["node_modules/**", this.cacheDir + "/**"],
            absolute: true,
        });
        const { baseUrl = ".", paths = {} } = this.tsconfig?.config.compilerOptions || {};
        await Promise.all(tsFiles.map(async (file) => {
            const source = await fs.promises.readFile(file, "utf8");
            const relativePath = path.relative(this.sourceDir, file);
            const outPath = path.join(this.cacheDir, relativePath.replace(/\.tsx?$/, ".js"));
            await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
            const result = await esbuild.transform(source, {
                loader: file.endsWith(".tsx") ? "tsx" : "ts",
                format: "cjs",
                target: "node16",
                sourcemap: true,
                sourcefile: file,
                tsconfigRaw: {
                    compilerOptions: {
                        baseUrl: path.join(this.sourceDir, baseUrl),
                        paths,
                    },
                },
            });
            let processedCode = result.code;
            processedCode = processedCode.replace(/require\(['"]([^'"]+)['"]\)/g, (match, importPath) => {
                if (!this.pathsMatcher) {
                    return match;
                }
                const matchedPath = this.pathsMatcher(importPath);
                if (matchedPath) {
                    const resolvedPath = path.relative(path.dirname(outPath), path.join(this.sourceDir, matchedPath[0]));
                    return `require('${resolvedPath}')`;
                }
                return match;
            });
            await fs.promises.writeFile(outPath, processedCode);
            if (result.map) {
                await fs.promises.writeFile(outPath + ".map", result.map);
            }
        }));
    }
    async run(entryPoint) {
        await this.buildProject();
        const relativePath = path.relative(this.sourceDir, path.resolve(entryPoint));
        const compiledPath = path.join(this.cacheDir, relativePath.replace(/\.tsx?$/, ".js"));
        if (!fs.existsSync(compiledPath)) {
            throw new Error(`Compiled file not found: ${compiledPath}`);
        }
    }
}
exports.LtNode = LtNode;
//# sourceMappingURL=main.js.map