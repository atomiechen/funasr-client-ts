import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/funasr.ts', 'src/mic.ts'],
    format: ['esm'],
    outDir: 'dist/esm',
    clean: true,
    sourcemap: true,
    dts: true,
    minify: true,
  },
  {
    entry: ['src/browser.ts'],
    format: ['iife'],
    outDir: 'dist/iife',
    globalName: 'funasr',
    clean: true,
    sourcemap: true,
    minify: true,
  },
]);
