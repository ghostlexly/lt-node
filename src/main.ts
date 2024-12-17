import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import ts from "typescript";
import tmp from "tmp";

export class LtNode {
  private outputDir: string;
  private tempDir: string;
  private sourceDir: string;

  constructor(options = {}) {
    this.sourceDir = process.cwd();
  }

  private getOutputDir = async () => {
    // If output dir is already set, return it
    if (this.outputDir) {
      return this.outputDir;
    }

    // If output dir is not set, create it and set it
    const outputDir = path.join(this.sourceDir, ".ts-cache");

    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    this.outputDir = outputDir;

    return outputDir;
  };

  private getTempDir = async () => {
    // If temp dir is already set, return it
    if (this.tempDir) {
      return this.tempDir;
    }

    // If temp dir is not set, create it and set it
    const tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    this.tempDir = tempDir;

    return tempDir;
  };

  private clearTempDir = async () => {
    const tempDir = await this.getTempDir();

    await fs.rm(tempDir, { recursive: true, force: true });
  };

  private buildProject = async () => {
    try {
      const outputDir = await this.getOutputDir();
      const tempDir = await this.getTempDir();
      const configPath = path.join(process.cwd(), "tsconfig.json");

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
      const compilerOptions: ts.CompilerOptions = {
        ...parsedCommandLine.options,
        outDir: outputDir, // Set output directory to my cache/output directory
        noCheck: true, // Disable type checking
        noEmit: false, // Emit files to disk
        emitDeclarationOnly: false, // Disable emitting declaration files only
        noEmitOnError: false, // Emit files even if there are errors
        skipLibCheck: true, // Skip library checks
        incremental: true, // Enable incremental compilation
      };

      // Create temporary directory for modified files
      // We need to add `// @ts-nocheck` to the top of the files
      const tempFileNames = await Promise.all(
        parsedCommandLine.fileNames.map(async (fileName) => {
          const content = await fs.readFile(fileName, "utf8");
          const tempFileName = path.join(
            tempDir,
            path.relative(this.sourceDir, fileName)
          );
          const tempFileDir = path.dirname(tempFileName);

          if (!existsSync(tempFileDir)) {
            await fs.mkdir(tempFileDir, { recursive: true });
          }

          // Add `// @ts-nocheck` to the top of the file
          await fs.writeFile(tempFileName, `// @ts-nocheck\n${content}`);
          return tempFileName;
        })
      );

      // Create program from temporary directory
      const program = ts.createProgram(tempFileNames, {
        ...compilerOptions,
      });

      // Emit all files
      program.emit();
    } catch (error) {
      throw error;
    } finally {
      await this.clearTempDir();
    }
  };

  public async run(entryPoint: string): Promise<void> {
    await this.buildProject();

    // const relativePath = path.relative(
    //   this.sourceDir,
    //   path.resolve(entryPoint)
    // );
  }
}
