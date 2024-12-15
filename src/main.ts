// src/index.ts
import * as esbuild from "esbuild";
import * as path from "path";
import * as fs from "fs";
import { createHash } from "crypto";
import * as Module from "module";

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

  private getCacheFilePath(sourcePath: string): string {
    const relativePath = path.relative(this.sourceDir, sourcePath);
    const hash = createHash("md5").update(relativePath).digest("hex");
    return path.join(this.cacheDir, `${hash}.js`);
  }

  private async transformAndCache(sourcePath: string): Promise<string> {
    const cacheFilePath = this.getCacheFilePath(sourcePath);

    // Check if cached version exists and is newer than source
    if (fs.existsSync(cacheFilePath)) {
      const sourceStats = fs.statSync(sourcePath);
      const cacheStats = fs.statSync(cacheFilePath);

      if (cacheStats.mtime > sourceStats.mtime) {
        return cacheFilePath;
      }
    }

    // Transform the file
    const result = await esbuild.build({
      entryPoints: [sourcePath],
      bundle: false,
      format: "cjs",
      platform: "node",
      target: "node14",
      sourcemap: true,
      outfile: cacheFilePath,
      write: true,
    });

    return cacheFilePath;
  }

  public async require(modulePath: string): Promise<any> {
    const absolutePath = path.resolve(modulePath);
    const cachedPath = await this.transformAndCache(absolutePath);
    return require(cachedPath);
  }

  public async run(entryPoint: string): Promise<void> {
    const absolutePath = path.resolve(entryPoint);
    const cachedPath = await this.transformAndCache(absolutePath);

    // Load the cached file
    require(cachedPath);
  }

  // Add watch mode support
  public async watch(entryPoint: string): Promise<void> {
    const ctx = await esbuild.context({
      entryPoints: [entryPoint],
      bundle: false,
      format: "cjs",
      platform: "node",
      target: "node14",
      sourcemap: true,
      outdir: this.cacheDir,
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
