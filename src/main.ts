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

  private buildProject = async () => {
    try {
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

      const outputDir = parsedCommandLine.options.outDir;

      // Second run with type checking disabled
      const programNoTypes = ts.createProgram(parsedCommandLine.fileNames, {
        ...parsedCommandLine.options,
        noEmit: false,
        emitDeclarationOnly: false,
        noEmitOnError: false,
        incremental: true,
        noCheck: true, // Disable type checking
        skipLibCheck: true,
        composite: true,
      });

      // Emit the compiled files
      programNoTypes.emit();
    } catch (error) {
      throw error;
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
