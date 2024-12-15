import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

export interface TypeScriptConfig {
  compilerOptions: ts.CompilerOptions;
  include?: string[];
  exclude?: string[];
}

export function loadTypeScriptConfig(searchPath: string): TypeScriptConfig {
  // Default compiler options similar to ts-node
  const defaultConfig: TypeScriptConfig = {
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

  // Find tsconfig.json file
  const configPath = ts.findConfigFile(
    searchPath,
    ts.sys.fileExists,
    "tsconfig.json"
  );

  if (!configPath) {
    return defaultConfig;
  }

  // Read and parse the config file
  const readConfig = ts.readConfigFile(configPath, ts.sys.readFile);
  if (readConfig.error) {
    console.warn("Error reading tsconfig.json:", readConfig.error);
    return defaultConfig;
  }

  // Parse the config content
  const parsedConfig = ts.parseJsonConfigFileContent(
    readConfig.config,
    ts.sys,
    path.dirname(configPath)
  );

  if (parsedConfig.errors.length) {
    console.warn("Error parsing tsconfig.json:", parsedConfig.errors);
    return defaultConfig;
  }

  // Merge with default config
  return {
    compilerOptions: {
      ...defaultConfig.compilerOptions,
      ...parsedConfig.options,
    },
    include: parsedConfig.raw.include,
    exclude: parsedConfig.raw.exclude,
  };
}
