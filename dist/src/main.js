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
const crypto_1 = require("crypto");
class LtNode {
    cacheDir;
    sourceDir;
    constructor(config) {
        this.cacheDir = config.cacheDir;
        this.sourceDir = config.sourceDir;
        this.ensureCacheDir();
    }
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    getCacheFilePath(sourcePath) {
        const relativePath = path.relative(this.sourceDir, sourcePath);
        const hash = (0, crypto_1.createHash)("md5").update(relativePath).digest("hex");
        return path.join(this.cacheDir, `${hash}.js`);
    }
    async transformAndCache(sourcePath) {
        const cacheFilePath = this.getCacheFilePath(sourcePath);
        if (fs.existsSync(cacheFilePath)) {
            const sourceStats = fs.statSync(sourcePath);
            const cacheStats = fs.statSync(cacheFilePath);
            if (cacheStats.mtime > sourceStats.mtime) {
                return cacheFilePath;
            }
        }
        const result = await esbuild.build({
            entryPoints: [sourcePath],
            bundle: false,
            format: "cjs",
            platform: "node",
            target: "node14",
            sourcemap: true,
            outfile: cacheFilePath,
            write: true,
        });
        return cacheFilePath;
    }
    async require(modulePath) {
        const absolutePath = path.resolve(modulePath);
        const cachedPath = await this.transformAndCache(absolutePath);
        return require(cachedPath);
    }
    async run(entryPoint) {
        const absolutePath = path.resolve(entryPoint);
        const cachedPath = await this.transformAndCache(absolutePath);
        require(cachedPath);
    }
    async watch(entryPoint) {
        const ctx = await esbuild.context({
            entryPoints: [entryPoint],
            bundle: false,
            format: "cjs",
            platform: "node",
            target: "node14",
            sourcemap: true,
            outdir: this.cacheDir,
        });
        await ctx.watch();
        console.log("Watching for changes...");
    }
}
exports.LtNode = LtNode;
require.extensions[".ts"] = function (module, filename) {
    const runner = new LtNode({
        cacheDir: path.join(process.cwd(), ".ts-cache"),
        sourceDir: process.cwd(),
    });
    runner
        .require(filename)
        .then((exports) => {
        module.exports = exports;
    })
        .catch((error) => {
        throw error;
    });
};
//# sourceMappingURL=main.js.map