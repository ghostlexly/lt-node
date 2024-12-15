import * as esbuild from "esbuild";
import * as path from "path";
import * as fs from "fs";
import { createHash } from "crypto";
import * as Module from "module";
import glob from "glob";

interface CacheConfig {
  cacheDir: string;
  sourceDir: string;
}

class LtNode {
  private cacheDir: string;
  private sourceDir: string;

  constructor(config: CacheConfig) {
    this.cacheDir = config.cacheDir;
    this.sourceDir = config.sourceDir;
    this.ensureCacheDir();
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private async buildProject(): Promise<void> {
    // Find all TypeScript files in the source directory
    const tsFiles = glob.sync("**/*.ts", {
      cwd: this.sourceDir,
      ignore: ["node_modules/**", this.cacheDir + "/**"],
      absolute: true,
    });

    // Transform all files
    await esbuild.build({
      entryPoints: tsFiles,
      bundle: false,
      format: "cjs",
      platform: "node",
      target: "node14",
      sourcemap: true,
      outdir: this.cacheDir,
      write: true,
      // Preserve directory structure
      outbase: this.sourceDir,
    });
  }

  private shouldRebuild(): boolean {
    if (!fs.existsSync(this.cacheDir)) return true;

    const tsFiles = glob.sync("**/*.ts", {
      cwd: this.sourceDir,
      ignore: ["node_modules/**", this.cacheDir + "/**"],
      absolute: true,
    });

    return tsFiles.some((file) => {
      const relativePath = path.relative(this.sourceDir, file);
      const cachedPath = path.join(
        this.cacheDir,
        relativePath.replace(/\.ts$/, ".js")
      );

      if (!fs.existsSync(cachedPath)) return true;

      const sourceStats = fs.statSync(file);
      const cacheStats = fs.statSync(cachedPath);
      return sourceStats.mtime > cacheStats.mtime;
    });
  }

  public async require(modulePath: string): Promise<any> {
    if (this.shouldRebuild()) {
      await this.buildProject();
    }

    const relativePath = path.relative(this.sourceDir, modulePath);
    const cachedPath = path.join(
      this.cacheDir,
      relativePath.replace(/\.ts$/, ".js")
    );
    return require(cachedPath);
  }

  public async run(entryPoint: string): Promise<void> {
    if (this.shouldRebuild()) {
      await this.buildProject();
    }

    const relativePath = path.relative(
      this.sourceDir,
      path.resolve(entryPoint)
    );
    const cachedPath = path.join(
      this.cacheDir,
      relativePath.replace(/\.ts$/, ".js")
    );
    require(cachedPath);
  }

  public async watch(entryPoint: string): Promise<void> {
    const ctx = await esbuild.context({
      entryPoints: [entryPoint],
      bundle: false,
      format: "cjs",
      platform: "node",
      target: "node14",
      sourcemap: true,
      outdir: this.cacheDir,
      outbase: this.sourceDir,
    });

    await ctx.watch();
    console.log("Watching for changes...");
  }
}

// Register extension handlers
require.extensions[".ts"] = function (module: Module, filename: string) {
  const runner = new LtNode({
    cacheDir: path.join(process.cwd(), ".ts-cache"),
    sourceDir: process.cwd(),
  });

  runner
    .require(filename)
    .then((exports) => {
      (module as any).exports = exports;
    })
    .catch((error) => {
      throw error;
    });
};

export { LtNode };
