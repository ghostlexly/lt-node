import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { getTsconfig } from "get-tsconfig";
import * as ts from "typescript";
import * as os from "os";
import * as tmp from "tmp";

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

    // Create temporary directory for modified files
    const tempDir = tmp.dirSync({ unsafeCleanup: true }).name;

    // Copy files to temporary directory with `// @ts-nocheck`
    const tempFileNames = parsedCommandLine.fileNames.map((fileName) => {
      const content = fs.readFileSync(fileName, "utf8");
      const tempFileName = path.join(
        tempDir,
        path.relative(this.sourceDir, fileName)
      );
      const tempFileDir = path.dirname(tempFileName);

      if (!fs.existsSync(tempFileDir)) {
        fs.mkdirSync(tempFileDir, { recursive: true });
      }

      fs.writeFileSync(tempFileName, `// @ts-nocheck\n${content}`);
      return tempFileName;
    });

    // Create program with temporary files
    const program = ts.createProgram(tempFileNames, {
      ...compilerOptions,
    });

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

    // Cleanup temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
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
