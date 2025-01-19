# ⚡️ LT-Node ⚡️

## Bringing Simplicity to TypeScript

> **LT-Node** _(lightning-node)_ is a robust Node.js tool that provides effortless TypeScript support in both development and production environments. It offers all the TypeScript features you love, right out of the box, with no additional configuration required.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Comparison with Other TypeScript Runtimes](#comparison-with-other-typescript-runtimes)
- [Why Choose LT-Node](#why-choose-lt-node)

## Installation

Install LT-Node globally using npm:

```bash
npm install -g lt-node
```

## Usage

LT-Node is a CLI tool designed to run TypeScript files in Node.js, serving as a faster alternative to ts-node. It supports both development and production environments.

- **Automatic Configuration**: Reads your `tsconfig.json` if available, or defaults to standard settings.
- **Static File Handling**: Automatically copies static files to the output directory for easy access in all environments.

To execute a TypeScript file, use:

```bash
lt-node src/main.ts
```

### Arguments

- `--watch`: Watch for file changes and automatically recompile and rerun the TypeScript files.
- `--noCheck`: Skip type checking, only compile and run the TypeScript files.

## Comparison with Other TypeScript Runtimes

| Feature                                         | LT-Node                 | ts-node            | tsx                         | ts-node-dev        | bun                               |
| ----------------------------------------------- | ----------------------- | ------------------ | --------------------------- | ------------------ | --------------------------------- |
| **Compilation Speed**                           | ⚡️ **Fast** (uses SWC) | 🐌 Slow (uses tsc) | ⚡️ **Fast** (uses esbuild) | 🐌 Slow (uses tsc) | ⚡️ **Very Fast** (custom engine) |
| **Type Checking**                               | ✅ **Parallel**         | ✅ Yes             | ❌ No                       | ✅ Yes             | ❌ No                             |
| **Run in Production Server**                    | ✅ **Yes**              | ❌ Not recommended | ❌ Not recommended          | ❌ Not recommended | ✅ Yes                            |
| **Run Same Code in Development and Production** | ✅ **Yes**              | ❌ No              | ❌ No                       | ❌ No              | ✅ Yes                            |
| **Path Aliases Support\***                      | ✅ **Yes**              | ❌ No              | ❌ No                       | ❌ No              | ❌ No                             |
| **Static File Support**                         | ✅ **Yes**              | ❌ No              | ❌ No                       | ❌ No              | ❌ No                             |
| **Watch Mode**                                  | ✅ **Yes**              | ❌ No              | ✅ Yes                      | ✅ Yes             | ✅ Yes                            |
| **HMR Support**                                 | ✅ **Yes**              | ❌ No              | ❌ No                       | ✅ Yes             | ✅ Yes                            |
| **Decorators Support**                          | ✅ **Yes**              | ❌ No              | ❌ No                       | ✅ Yes             | ✅ Yes                            |
| **Node.js Compatibility**                       | ✅ **100%**             | ✅ 100%            | ✅ 100%                     | ✅ 100%            | ⚠️ Partial                        |
| **npm Ecosystem Compatibility**                 | ✅ **100%**             | ✅ 100%            | ✅ 100%                     | ✅ 100%            | ⚠️ Partial                        |
| **tsconfig.json Support**                       | ✅ **Full**             | ✅ Full            | ⚠️ Partial                  | ✅ Full            | ⚠️ Partial                        |
| **Source Maps**                                 | ✅ **Yes**              | ✅ Yes             | ✅ Yes                      | ✅ Yes             | ✅ Yes                            |
| **Non-TS Files Support**                        | ✅ **Yes**              | ✅ Yes             | ✅ Yes                      | ✅ Yes             | ✅ Yes                            |

_Path Aliases Support_: Enables loading of modules specified in the `paths` section of `tsconfig.json` or `jsconfig.json`, both at runtime and through the API.

_Static File Support_: Automatically copies non-TypeScript files to the output directory, ensuring access to all files in the production build as during development, without requiring additional configuration, plugins, or scripts.

## Why Choose LT-Node

- **Effortless Setup**: Enjoy all the best features without extra configuration or dependencies.
- **Streamlined Workflow**: Simplify your build process and development workflow.
- **Consistent Environments**: Run the same code in both production and development.
- **Fast Execution**: Benefit from rapid execution with parallel type checking.
- **Full tsconfig.json Support**: Complete compatibility with your TypeScript configuration.
- **Parallel Type Checking**: Maximize productivity with non-blocking type checking.
- **Complete Node.js Compatibility**: Ensure seamless integration with Node.js.
- **Static File Support**: Automatically copies non-TypeScript files to the output directory, ensuring access to all files in the production build as during development, without requiring additional configuration, plugins, or scripts.
- **Watch Mode**: Automatically recompiles and reruns the TypeScript files when you make changes.

Adopt **LT-Node** today and transform your TypeScript development experience!
