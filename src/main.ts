import * as esbuild from "esbuild";
import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { getTsconfig, createPathsMatcher } from "get-tsconfig";

interface NodeOptions {
  cacheDir?: string;
  project?: string;
}

export class LtNode {
  private cacheDir: string;
  private sourceDir: string;
  private tsconfig: ReturnType<typeof getTsconfig>;
  private pathsMatcher: ReturnType<typeof createPathsMatcher>;

  constructor(options: NodeOptions = {}) {
    this.sourceDir = process.cwd();
    this.cacheDir = options.cacheDir || path.join(this.sourceDir, ".ts-cache");

    // Load TypeScript config using get-tsconfig
    this.tsconfig = getTsconfig(this.sourceDir);
    if (!this.tsconfig) {
      throw new Error("No tsconfig.json found");
    }

    // Create paths matcher for aliases
    this.pathsMatcher = createPathsMatcher(this.tsconfig);

    this.ensureCacheDir();
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async buildProject(): Promise<void> {
    const tsFiles = await glob("**/*.{ts,tsx}", {
      cwd: this.sourceDir,
      ignore: ["node_modules/**", this.cacheDir + "/**"],
      absolute: true,
    });

    const { baseUrl = ".", paths = {} } =
      this.tsconfig?.config.compilerOptions || {};

    await Promise.all(
      tsFiles.map(async (file) => {
        const source = await fs.promises.readFile(file, "utf8");
        const relativePath = path.relative(this.sourceDir, file);
        const outPath = path.join(
          this.cacheDir,
          relativePath.replace(/\.tsx?$/, ".js")
        );

        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });

        const result = await esbuild.transform(source, {
          loader: file.endsWith(".tsx") ? "tsx" : "ts",
          format: "cjs",
          target: "node16",
          sourcemap: true,
          sourcefile: file,
          tsconfigRaw: {
            compilerOptions: {
              baseUrl: path.join(this.sourceDir, baseUrl),
              paths,
            },
          },
        });

        // Process imports using pathsMatcher
        let processedCode = result.code;
        processedCode = processedCode.replace(
          /require\(['"]([^'"]+)['"]\)/g,
          (match, importPath) => {
            if (!this.pathsMatcher) {
              return match;
            }

            const matchedPath = this.pathsMatcher(importPath);
            if (matchedPath) {
              const resolvedPath = path.relative(
                path.dirname(outPath),
                path.join(this.sourceDir, matchedPath[0])
              );
              return `require('${resolvedPath}')`;
            }
            return match;
          }
        );

        await fs.promises.writeFile(outPath, processedCode);
        if (result.map) {
          await fs.promises.writeFile(outPath + ".map", result.map);
        }
      })
    );
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
