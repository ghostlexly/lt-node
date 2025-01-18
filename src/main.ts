import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import ts from "typescript";
import { JscTarget, transformFile } from "@swc/core";

export class LtNode {
  private outputDir: string;
  private tsconfigPath: string;

  constructor(tsconfigPath = path.join(process.cwd(), "tsconfig.json")) {
    this.tsconfigPath = tsconfigPath;
  }

  private async getParsedCommandLine() {
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

    return parsedCommandLine;
  }

  private async getOutputDir(tsOptions: ts.CompilerOptions) {
    if (this.outputDir) {
      return this.outputDir;
    }

    const outDir = tsOptions.outDir
      ? path.resolve(tsOptions.outDir)
      : path.join(process.cwd(), "dist");

    if (!existsSync(outDir)) {
      await fs.mkdir(outDir, { recursive: true });
    }

    this.outputDir = outDir;
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

  private async buildProjectWithSwc({
    parsedTsConfig,
  }: {
    parsedTsConfig: ts.ParsedCommandLine;
  }) {
    // Get the file names and options from the parsed tsconfig and find the output dir
    const { options: tsOptions, fileNames } = parsedTsConfig;
    const outputDir = await this.getOutputDir(tsOptions);

    // Map TS options to SWC equivalents
    const swcTarget = this.mapTarget(
      tsOptions.target ?? ts.ScriptTarget.ES2022
    );
    const swcModule = this.mapModuleKind(
      tsOptions.module ?? ts.ModuleKind.ESNext
    );

    // If there's a rootDir set, we can replicate the relative path structure in outDir
    const rootDir = tsOptions.rootDir ?? process.cwd();

    // 3) Transpile each file using SWC
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

      // 4) Write the output and source map
      await fs.writeFile(outFile, code, "utf8");

      if (map) {
        await fs.writeFile(outFile + ".map", map, "utf8");
      }
    }
  }

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

  public async run(entryPoint: string): Promise<void> {
    const parsedTsConfig = await this.getParsedCommandLine();
    const tsOptions = parsedTsConfig.options;

    // Get the output directory and resolve the transpiled entry point path
    const outputDir = await this.getOutputDir(tsOptions);
    const entryJs = path.join(
      outputDir,
      path.relative(process.cwd(), entryPoint).replace(/\.tsx?$/, ".js")
    );

    // (Optional) Type-check your code separately with "tsc --noEmit" if you want type safety.
    // For example:
    //   import { execSync } from "child_process";
    //   execSync(`tsc --noEmit -p ${this.tsconfigPath}`, { stdio: "inherit" });

    // Transpile with SWC
    await this.buildProjectWithSwc({ parsedTsConfig });

    // Create a new Node.js process with the arguments
    const { execArgs, scriptArgs } = await this.getArgs({ entryPoint });

    const { spawn } = await import("child_process");
    const nodeProcess = spawn("node", [...execArgs, entryJs, ...scriptArgs], {
      stdio: "inherit",
      env: process.env,
    });

    // Handle the process exit
    return new Promise((resolve, reject) => {
      nodeProcess.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      nodeProcess.on("error", (err) => {
        reject(err);
      });
    });
  }
}
