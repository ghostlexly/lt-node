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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ts = __importStar(require("typescript"));
class LtNode {
    cacheDir;
    sourceDir;
    constructor(options = {}) {
        this.sourceDir = process.cwd();
        this.cacheDir = options.cacheDir || path.join(this.sourceDir, ".ts-cache");
        this.ensureCacheDir();
    }
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    async buildProject() {
        const configPath = path.join(process.cwd(), "tsconfig.json");
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
        const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
            },
        });
        if (!parsedCommandLine) {
            throw new Error(`Failed to parse tsconfig at ${configPath}`);
        }
        const compilerOptions = {
            ...parsedCommandLine.options,
            outDir: this.cacheDir,
            noEmit: false,
            emitDeclarationOnly: false,
        };
        const program = ts.createProgram(parsedCommandLine.fileNames, compilerOptions);
        const diagnostics = ts.getPreEmitDiagnostics(program);
        if (diagnostics.length > 0) {
            console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
                getCurrentDirectory: () => process.cwd(),
                getCanonicalFileName: (fileName) => fileName,
                getNewLine: () => ts.sys.newLine,
            }));
            throw new Error("TypeScript compilation failed");
        }
        const emitResult = program.emit();
        if (emitResult.diagnostics.length > 0) {
            console.error(ts.formatDiagnosticsWithColorAndContext(emitResult.diagnostics, {
                getCurrentDirectory: () => process.cwd(),
                getCanonicalFileName: (fileName) => fileName,
                getNewLine: () => ts.sys.newLine,
            }));
            throw new Error("TypeScript emission failed");
        }
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