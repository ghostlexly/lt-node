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
exports.loadTypeScriptConfig = loadTypeScriptConfig;
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
function loadTypeScriptConfig(searchPath) {
    const defaultConfig = {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.Node10,
            esModuleInterop: true,
            allowJs: true,
            skipLibCheck: true,
            sourceMap: true,
        },
    };
    const configPath = ts.findConfigFile(searchPath, ts.sys.fileExists, "tsconfig.json");
    if (!configPath) {
        return defaultConfig;
    }
    const readConfig = ts.readConfigFile(configPath, ts.sys.readFile);
    if (readConfig.error) {
        console.warn("Error reading tsconfig.json:", readConfig.error);
        return defaultConfig;
    }
    const parsedConfig = ts.parseJsonConfigFileContent(readConfig.config, ts.sys, path.dirname(configPath));
    if (parsedConfig.errors.length) {
        console.warn("Error parsing tsconfig.json:", parsedConfig.errors);
        return defaultConfig;
    }
    return {
        compilerOptions: {
            ...defaultConfig.compilerOptions,
            ...parsedConfig.options,
        },
        include: parsedConfig.raw.include,
        exclude: parsedConfig.raw.exclude,
    };
}
//# sourceMappingURL=config.js.map