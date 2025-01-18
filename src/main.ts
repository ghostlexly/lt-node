import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { glob } from "glob";
import ts from "typescript";
import { JscTarget, transformFile } from "@swc/core";
import { spawn } from "child_process";
import { logger } from "./logger";
import chokidar from "chokidar";
import chalk from "chalk";

export class LtNode {
  private tsconfigPath: string;
  private parsedTsConfig: ts.ParsedCommandLine;
  private isWatching: boolean = false;
  private isNoCheck: boolean = false;
  private currentNodeProcess: ReturnType<typeof spawn> | null = null;

  constructor(tsconfigPath = path.join(process.cwd(), "tsconfig.json")) {
    this.tsconfigPath = tsconfigPath;
  }

  private parseTsConfig = async () => {
    // Use a default configuration if the tsconfig.json does not exist
    if (!existsSync(this.tsconfigPath)) {
      this.parsedTsConfig = {
        options: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          outDir: path.join(process.cwd(), "dist"),
          rootDir: process.cwd(),
        },
        fileNames: await glob("**/*.ts", {
          ignore: ["**/node_modules/**"],
          cwd: process.cwd(),
        }),
        errors: [],
      };
      return this.parsedTsConfig;
    }

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
  };

  private getOutputDir = async () => {
    const { options: tsOptions } = this.parsedTsConfig;

    const outDir = tsOptions.outDir
      ? path.resolve(tsOptions.outDir)
      : path.join(process.cwd(), "dist");

    if (!existsSync(outDir)) {
      await fs.mkdir(outDir, { recursive: true });
    }

    return outDir;
  };

  private mapTarget = (tsTarget: ts.ScriptTarget): JscTarget => {
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
  };

  private mapModuleKind = (tsModuleKind: ts.ModuleKind): "commonjs" | "es6" => {
    switch (tsModuleKind) {
      case ts.ModuleKind.CommonJS:
        return "commonjs";
      // For ESNext, ES2015, ES2020, etc., treat them as ESM ("es6") in SWC's nomenclature.
      default:
        return "es6";
    }
  };

  private buildProjectWithSwc = async () => {
    // Get the file names and options from the parsed tsconfig and find the output dir
    const { options: tsOptions, fileNames } = this.parsedTsConfig;
    const outputDir = await this.getOutputDir();

    // If there's a rootDir set, we can replicate the relative path structure in outDir
    const rootDir = tsOptions.rootDir ?? process.cwd();

    // Map TS options to SWC equivalents once, outside the loop
    const swcTarget = this.mapTarget(
      tsOptions.target ?? ts.ScriptTarget.ES2022
    );
    const swcModule = this.mapModuleKind(
      tsOptions.module ?? ts.ModuleKind.ESNext
    );

    // Use Promise.all to parallelize file transformations
    await Promise.all(
      fileNames.map(async (tsFile) => {
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

        // Write code and source map files in parallel
        return Promise.all([
          fs.writeFile(outFile, code, "utf8"),
          map ? fs.writeFile(outFile + ".map", map, "utf8") : Promise.resolve(),
        ]);
      })
    );
  };

  /**
   * Type-check the codebase using TypeScript compiler API
   */
  private typeCheck = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const program = ts.createProgram({
        rootNames: this.parsedTsConfig.fileNames,
        options: this.parsedTsConfig.options,
      });

      const diagnostics = [
        ...program.getSemanticDiagnostics(),
        ...program.getSyntacticDiagnostics(),
      ];

      if (diagnostics.length > 0) {
        // Use TypeScript's built-in formatter
        const formatHost: ts.FormatDiagnosticsHost = {
          getCanonicalFileName: (path) => path,
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getNewLine: () => ts.sys.newLine,
        };

        const output = ts.formatDiagnosticsWithColorAndContext(
          diagnostics,
          formatHost
        );
        process.stderr.write(output);
        resolve(false);
      }

      resolve(true);
    });
  };

  public copyNonTsFiles = async () => {
    const { options: tsOptions } = this.parsedTsConfig;
    const outputDir = await this.getOutputDir();
    const rootDir = tsOptions.rootDir ?? process.cwd();

    const nonTsFiles = await glob("**/*", {
      ignore: ["**/*.{ts,tsx,js,jsx}", "**/node_modules/**", outputDir + "/**"],
      nodir: true,
      cwd: rootDir,
    });

    for (const file of nonTsFiles) {
      const sourcePath = path.join(rootDir, file);
      const destPath = path.join(outputDir, file);

      // Ensure the destination directory exists
      await fs.mkdir(path.dirname(destPath), { recursive: true });

      // Copy the file
      await fs.copyFile(sourcePath, destPath);
    }
  };

  /**
   * Get the arguments and separate node args from script args, so we can pass them to the child process.
   */
  private getArgs = ({ entryPoint }: { entryPoint: string }) => {
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
  };

  private stopNodeProcess = async () => {
    try {
      await new Promise((resolve, reject) => {
        if (!this.currentNodeProcess) {
          resolve(true);
          return;
        }

        this.currentNodeProcess.on("close", () => {
          this.currentNodeProcess = null;
          resolve(true);
        });

        this.currentNodeProcess.kill("SIGTERM");
      });
    } catch (error) {
      this.currentNodeProcess?.kill("SIGKILL");
      this.currentNodeProcess = null;
      throw error;
    }
  };

  /**
   * Run the transpiled entry point with a new Node.js process.
   */
  private runNodeJs = async ({ entryPoint }: { entryPoint: string }) => {
    // Get the output directory and resolve the transpiled entry point path
    const outputDir = await this.getOutputDir();

    const entryJs = path.join(
      outputDir,
      path.relative(process.cwd(), entryPoint).replace(/\.tsx?$/, ".js")
    );

    // If we're already running a process in watch mode, clean up the previous process
    if (this.currentNodeProcess) {
      await this.stopNodeProcess();
    }

    // Handle the process exit
    return new Promise((resolve, reject) => {
      // Create a new Node.js process with the arguments
      const { execArgs, scriptArgs } = this.getArgs({ entryPoint });

      // Filter out lt-node args from execArgs
      const filteredExecArgs = execArgs.filter(
        (arg) => arg !== "--watch" && arg !== "--noCheck"
      );

      this.currentNodeProcess = spawn(
        "node",
        [...filteredExecArgs, entryJs, ...scriptArgs],
        {
          stdio: "inherit",
          env: process.env,
        }
      );

      if (!this.isWatching) {
        this.currentNodeProcess.on("exit", (code) => {
          if (code === 0 || code === null) {
            resolve(true);
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        this.currentNodeProcess.on("error", (err) => {
          reject(err);
        });
      }
    });
  };

  /**
   * Build, type check, and run the entry point.
   */
  private buildAndRun = async (entryPoint: string) => {
    try {
      // Build project and copy files
      await Promise.all([this.copyNonTsFiles(), this.buildProjectWithSwc()]);

      // Run the Node.js process
      const runProcess = this.runNodeJs({ entryPoint });

      // Perform type checking if enabled
      if (!this.isNoCheck) {
        setTimeout(() => {
          // Don't await this promise
          this.typeCheck().then((passed) => {
            if (!passed) {
              logger.log({
                type: "error",
                message: "Type-check failed - see errors above.",
              });
            }
          });
        }, 0);
      }

      await runProcess;
    } catch (error) {
      logger.log({
        type: "error",
        message: String(error),
      });
    }
  };

  private watchFiles = async (entryPoint: string) => {
    const rootDir = this.parsedTsConfig.options.rootDir ?? process.cwd();
    const outputDir = await this.getOutputDir();

    const watcher = chokidar.watch(rootDir, {
      ignored: (watchPath, stats) => {
        // Ignore node_modules
        if (watchPath.includes(path.join(rootDir, "node_modules"))) {
          return true;
        }

        // Ignore .git
        if (watchPath.includes(path.join(rootDir, ".git"))) {
          return true;
        }

        // Ignore the output directory
        if (watchPath.includes(outputDir)) {
          return true;
        }

        // Ignore non-ts files
        if (
          stats?.isFile() &&
          !watchPath.endsWith(".ts") &&
          !watchPath.endsWith(".tsx") &&
          !watchPath.endsWith(".js") &&
          !watchPath.endsWith(".jsx") &&
          !watchPath.endsWith(".json")
        ) {
          return true;
        }

        return false;
      },
      persistent: true,
      usePolling: process.platform === "darwin", // Use polling on macOS

      // Increase performance and reduce file descriptors
      atomic: true,
      ignoreInitial: true,
    });

    watcher.on("change", async (filename) => {
      logger.log({
        type: "info",
        message: `File changed: ${chalk.yellow(filename)}. Rebuilding...`,
      });

      await this.buildAndRun(entryPoint);
    });

    logger.log({
      type: "info",
      message: "Watching for file changes...",
    });
  };

  /**
   * The main entry point for the application.
   */
  public run = async (entryPoint: string) => {
    // Get the arguments
    const { execArgs } = this.getArgs({ entryPoint });

    // Check if we're in watch mode
    this.isWatching = execArgs.includes("--watch");

    // Check if we're skipping type checking
    this.isNoCheck = execArgs.includes("--noCheck");

    // Parse the tsconfig.json file
    await this.parseTsConfig();

    // If we're in watch mode, start watcher for file changes
    if (this.isWatching) {
      this.watchFiles(entryPoint);
    }

    // build, type check, run
    await this.buildAndRun(entryPoint);
  };
}
