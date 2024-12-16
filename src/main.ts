import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { getTsconfig } from "get-tsconfig";
import * as ts from "typescript";

interface NodeOptions {
  cacheDir?: string;
  project?: string;
}

export class LtNode {
  private cacheDir: string;
  private sourceDir: string;

  constructor(options: NodeOptions = {}) {
    this.sourceDir = process.cwd();
    this.cacheDir = options.cacheDir || path.join(this.sourceDir, ".ts-cache");

    this.ensureCacheDir();
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async buildProject(): Promise<void> {
    const configPath = path.join(process.cwd(), "tsconfig.json");
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

    const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
      configPath,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
          );
        },
      }
    );

    if (!parsedCommandLine) {
      throw new Error(`Failed to parse tsconfig at ${configPath}`);
    }

    // Override outDir to use cache directory
    const compilerOptions = {
      ...parsedCommandLine.options,
      outDir: this.cacheDir,
      noEmit: false,
      emitDeclarationOnly: false,
      noEmitOnError: false,
      skipLibCheck: true,
      incremental: true,
      transpileOnly: true,
      isolatedModules: true,
    };

    // Create program with all root files from tsconfig
    const program = ts.createProgram(
      parsedCommandLine.fileNames,
      compilerOptions
    );

    // Get diagnostics
    // const diagnostics = ts.getPreEmitDiagnostics(program);
    // if (diagnostics.length > 0) {
    //   console.error(
    //     ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    //       getCurrentDirectory: () => process.cwd(),
    //       getCanonicalFileName: (fileName) => fileName,
    //       getNewLine: () => ts.sys.newLine,
    //     })
    //   );
    //   throw new Error("TypeScript compilation failed");
    // }

    // Emit all files
    const emitResult = program.emit();

    if (emitResult.diagnostics.length > 0) {
      console.error(
        ts.formatDiagnosticsWithColorAndContext(emitResult.diagnostics, {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (fileName) => fileName,
          getNewLine: () => ts.sys.newLine,
        })
      );
      throw new Error("TypeScript emission failed");
    }
  }

  public async run(entryPoint: string): Promise<void> {
    await this.buildProject();

    const relativePath = path.relative(
      this.sourceDir,
      path.resolve(entryPoint)
    );
    const compiledPath = path.join(
      this.cacheDir,
      relativePath.replace(/\.tsx?$/, ".js")
    );

    if (!fs.existsSync(compiledPath)) {
      throw new Error(`Compiled file not found: ${compiledPath}`);
    }

    // require(compiledPath);
  }
}
