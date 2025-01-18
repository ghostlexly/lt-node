import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import ts from "typescript";
import { JscTarget, transformFile } from "@swc/core";
import { spawn } from "child_process";
import { helper } from "./helper";

export class LtNode {
  private tsconfigPath: string;
  private parsedTsConfig: ts.ParsedCommandLine;

  constructor(tsconfigPath = path.join(process.cwd(), "tsconfig.json")) {
    this.tsconfigPath = tsconfigPath;
  }

  private async parseTsConfig() {
    // This method calls TS's higher-level API to parse the config
    const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
      this.tsconfigPath,
      /* configOverrides */ {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diag) => {
          throw new Error(
            ts.flattenDiagnosticMessageText(diag.messageText, "\n")
          );
        },
      }
    );

    if (!parsedCommandLine) {
      throw new Error(`Failed to parse ${this.tsconfigPath}`);
    }

    // Set the parsedTsConfig variable
    this.parsedTsConfig = parsedCommandLine;

    return parsedCommandLine;
  }

  private async getOutputDir() {
    const { options: tsOptions } = this.parsedTsConfig;

    const outDir = tsOptions.outDir
      ? path.resolve(tsOptions.outDir)
      : path.join(process.cwd(), "dist");

    if (!existsSync(outDir)) {
      await fs.mkdir(outDir, { recursive: true });
    }

    return outDir;
  }

  private mapTarget(tsTarget: ts.ScriptTarget): JscTarget {
    switch (tsTarget) {
      case ts.ScriptTarget.ES5:
        return "es5";
      case ts.ScriptTarget.ES2015:
        return "es2015";
      case ts.ScriptTarget.ES2016:
        return "es2016";
      case ts.ScriptTarget.ES2017:
        return "es2017";
      case ts.ScriptTarget.ES2018:
        return "es2018";
      case ts.ScriptTarget.ES2019:
        return "es2019";
      case ts.ScriptTarget.ES2020:
        return "es2020";
      case ts.ScriptTarget.ES2021:
        return "es2021";
      case ts.ScriptTarget.ES2022:
        return "es2022";
      default:
        return "es2022";
    }
  }

  private mapModuleKind(tsModuleKind: ts.ModuleKind): "commonjs" | "es6" {
    switch (tsModuleKind) {
      case ts.ModuleKind.CommonJS:
        return "commonjs";
      // For ESNext, ES2015, ES2020, etc., treat them as ESM ("es6") in SWC's nomenclature.
      default:
        return "es6";
    }
  }

  private async buildProjectWithSwc() {
    // Get the file names and options from the parsed tsconfig and find the output dir
    const { options: tsOptions, fileNames } = this.parsedTsConfig;
    const outputDir = await this.getOutputDir();

    // Map TS options to SWC equivalents
    const swcTarget = this.mapTarget(
      tsOptions.target ?? ts.ScriptTarget.ES2022
    );
    const swcModule = this.mapModuleKind(
      tsOptions.module ?? ts.ModuleKind.ESNext
    );

    // If there's a rootDir set, we can replicate the relative path structure in outDir
    const rootDir = tsOptions.rootDir ?? process.cwd();

    // Transpile each file using SWC
    for (const tsFile of fileNames) {
      const relPath = path.relative(rootDir, tsFile);
      const outFile = path.join(outputDir, relPath.replace(/\.tsx?$/, ".js"));

      // Ensure sub-folders exist
      await fs.mkdir(path.dirname(outFile), { recursive: true });

      const { code, map } = await transformFile(tsFile, {
        jsc: {
          parser: {
            syntax: "typescript",

            // we can enable tsx if needed:
            tsx: false,

            // enable if you use experimental decorators:
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

      // Write the output and source map
      await fs.writeFile(outFile, code, "utf8");

      if (map) {
        await fs.writeFile(outFile + ".map", map, "utf8");
      }
    }
  }

  /**
   * Type-check the codebase separately with "tsc --noEmit" for type safety.
   */
  public async typeCheck() {
    await helper
      .asyncSpawn(`tsc --noEmit -p ${this.tsconfigPath}`)
      .catch(() => {
        helper.log({ message: "Type-checks failed !", type: "error" });
      });
  }

  /**
   * Get the arguments and separate node args from script args, so we can pass them to the child process.
   */
  private async getArgs({ entryPoint }: { entryPoint: string }) {
    // Get the arguments and separate node args from script args
    const entryPointIndex = process.argv.indexOf(entryPoint);
    const allArgs = process.argv.slice(entryPointIndex + 1);

    // Separate Node.js args (starting with --) from script args
    const execArgs: string[] = [];
    const scriptArgs: string[] = [];

    allArgs.forEach((arg) => {
      if (arg.startsWith("--")) {
        execArgs.push(arg);
      } else {
        scriptArgs.push(arg);
      }
    });

    return { execArgs, scriptArgs };
  }

  /**
   * Run the transpiled entry point with a new Node.js process.
   */
  private async runNodeJs({ entryPoint }: { entryPoint: string }) {
    // Get the output directory and resolve the transpiled entry point path
    const outputDir = await this.getOutputDir();

    const entryJs = path.join(
      outputDir,
      path.relative(process.cwd(), entryPoint).replace(/\.tsx?$/, ".js")
    );

    // Create a new Node.js process with the arguments
    const { execArgs, scriptArgs } = await this.getArgs({ entryPoint });

    const nodeProcess = spawn("node", [...execArgs, entryJs, ...scriptArgs], {
      stdio: "inherit",
      env: process.env,
    });

    // Handle the process exit
    return new Promise((resolve, reject) => {
      nodeProcess.on("exit", (code) => {
        if (code === 0 || code === null) {
          resolve(true);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      nodeProcess.on("error", (err) => {
        reject(err);
      });

      // Handle the SIGINT signal (Ctrl+C) to stop the child process before exiting
      process.on("SIGINT", () => {
        nodeProcess.kill();
      });
    });
  }

  /**
   * Build the project with SWC and run the transpiled entry point.
   */
  public async buildAndRun({ entryPoint }: { entryPoint: string }) {
    // Build the project with SWC
    await this.buildProjectWithSwc();

    // Run the transpiled entry point
    await this.runNodeJs({
      entryPoint,
    });
  }

  /**
   * The main entry point for the application.
   */
  public async run(entryPoint: string): Promise<void> {
    await this.parseTsConfig();

    // Run the type-check and build the project with SWC in parallel
    await Promise.all([this.typeCheck(), this.buildAndRun({ entryPoint })]);
  }
}
