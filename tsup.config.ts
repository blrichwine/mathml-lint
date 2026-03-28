import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry points (no shebang)
  {
    entry: {
      index: 'src/index.ts',
      'formats/html': 'src/formats/html.ts',
      'formats/epub': 'src/formats/epub.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
  },
  // CLI entry point (shebang added)
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
