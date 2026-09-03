import { defineConfig } from "tsup";

export default defineConfig([
    {
        // React entry. "use client" is banner-injected rather than written at the top of each
        // source file because tsup would otherwise hoist the directive out during bundling —
        // Next's App Router needs it to survive to the emitted chunk.
        entry: { index: "src/index.ts" },
        format: ["esm", "cjs"],
        dts: true,
        // Cleaning is the `prebuild` script's job, not tsup's: the two configs below run in
        // parallel, so a `clean: true` here could delete the cli bundle the other one just
        // wrote. That surfaced as npm stripping the "bin" entry at publish time.
        clean: false,
        sourcemap: true,
        // No `treeshake` here on purpose: it routes the bundle through rollup, which strips
        // module-level directives and silently drops the "use client" banner below. esbuild
        // already tree-shakes, and package.json marks only CSS as side-effectful.
        external: ["react", "react-dom"],
        banner: { js: '"use client";' },
        // Ships alongside the JS so consumers can `import "@ewb/cli/styles.css"`.
        publicDir: "src/styles",
    },
    {
        entry: { cli: "src/cli.ts" },
        format: ["cjs"],
        platform: "node",
        target: "node18",
        clean: false,
        sourcemap: false,
        shims: true,
        banner: { js: "#!/usr/bin/env node" },
    },
]);
