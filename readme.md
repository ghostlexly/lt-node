## lt-node vs Other TypeScript Runtime Solutions

| Feature                         | lt-node                 | ts-node            | tsx                         | ts-node-dev        | bun                               |
| ------------------------------- | ----------------------- | ------------------ | --------------------------- | ------------------ | --------------------------------- |
| **Compilation Speed**           | ⚡️ **Fast** (uses SWC) | 🐌 Slow (uses tsc) | ⚡️ **Fast** (uses esbuild) | 🐌 Slow (uses tsc) | ⚡️ **Very Fast** (custom engine) |
| **Type Checking**               | ✅ **Parallel**         | ✅ Yes             | ❌ No                       | ✅ Yes             | ❌ No                             |
| **Can i run in production?**    | ✅ **Yes**              | ❌ Not recommended | ❌ Not recommended          | ❌ Not recommended | ✅ Yes                            |
| **Run Same Code in Prod & Dev** | ✅ **Yes**              | ❌ No              | ❌ No                       | ❌ No              | ❌ No                             |
| **Paths Aliases Support\***     | ✅ **Yes**              | ❌ No              | ❌ No                       | ❌ No              | ❌ No                             |
| **Copy Non-TS Files**           | ✅ **Yes**              | ❌ No              | ❌ No                       | ❌ No              | ❌ No                             |
| **Watch Mode**                  | ✅ **Yes**              | ❌ No              | ✅ Yes                      | ✅ Yes             | ✅ Yes                            |
| **HMR Support**                 | ✅ **Yes**              | ❌ No              | ❌ No                       | ✅ Yes             | ✅ Yes                            |
| **Decorators Support**          | ✅ **Yes**              | ❌ No              | ❌ No                       | ✅ Yes             | ✅ Yes                            |
| **Node.js Compatibility**       | ✅ **100%**             | ✅ 100%            | ✅ 100%                     | ✅ 100%            | ⚠️ Partial                        |
| **npm Ecosystem Compatibility** | ✅ **100%**             | ✅ 100%            | ✅ 100%                     | ✅ 100%            | ⚠️ Partial                        |
| **tsconfig.json Support**       | ✅ **Full**             | ✅ Full            | ⚠️ Partial                  | ✅ Full            | ⚠️ Partial                        |
| **Source Maps**                 | ✅ **Yes**              | ✅ Yes             | ✅ Yes                      | ✅ Yes             | ✅ Yes                            |
| **Non-TS Files Support**        | ✅ **Yes**              | ✅ Yes             | ✅ Yes                      | ✅ Yes             | ✅ Yes                            |

_Paths Aliases Support_: Enables loading of modules specified in the `paths` section of `tsconfig.json` or `jsconfig.json`, both at runtime and through the API.

_Non-TS Files Support_: Automatically copies non-TypeScript files to the output directory, ensuring access to all files in the production build as during development, without requiring additional configuration, plugins, or scripts.

## Key Differentiators

- **lt-node**: Experience the power of `lt-node`, combining ultra-fast compilation with SWC and parallel type checking. Enjoy unmatched speed and optimal type safety, all without extra configuration. With `lt-node`, you get the best of TypeScript right out of the box.

- **ts-node**: A traditional solution, reliable but slower due to TypeScript compilation. Requires additional configuration to get paths aliases, watch mode, or HMR with additional dependencies. Not recommended for production.

- **tsx**: Focused on speed with esbuild, but at the cost of type checking.

- **ts-node-dev**: Adds watch mode and HMR to ts-node, ideal for development.

- **bun**: An all-in-one JavaScript runtime with built-in TypeScript support, very fast but with some compatibility trade-offs.

## When to Choose lt-node

- **Unlock Your Potential**: With `lt-node`, enjoy all the best features without extra configuration, additional dependencies, and for free.

- **Simplify Your Process**: Streamline your build process and development workflow with `lt-node`.

- **Unify Your Environments**: Run the same code in production and development without hassle.

- **Accelerate Your Execution**: Benefit from fast execution with type checking, without compromise.

- **Full tsconfig.json Support**: Enjoy complete compatibility with your TypeScript configuration.

- **Parallel Type Checking**: Prefer type checking that doesn't block execution, for maximum productivity.

- **Complete Node.js Compatibility**: Ensure 100% compatibility with Node.js, for seamless integration.

Adopt `lt-node` today and transform your TypeScript development experience!
