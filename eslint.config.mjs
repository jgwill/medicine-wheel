// ESLint flat config. `npm run lint` invoked `next lint` for a long time with no config file
// anywhere in the repo, so it inspected nothing and reported nothing — a smoke detector with
// no battery. This file gives it one.
//
// Scope: the Next.js app surface (app/, components/, lib/, hooks/) plus the CLI. The workspace
// packages under src/ and mcp/ compile with `strict: true` through their own tsconfigs and are
// excluded here for now; widening to them is a deliberate later step, not a side effect.
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'src/**',
      'mcp/**',
      'output/**',
      'public/**',
      'scripts/**',
      'tests/**',
      'next-env.d.ts',
      '*.config.*',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // 36 `as any` casts on 2026-09-13, almost all at the lib/store.ts boundary where the
      // JSONL store's loose shapes meet ontology-core's strict ones. Warn, not error, so the
      // real errors above cannot hide behind them — and so the count can only go down: fix a
      // site, and the warning list is the ratchet. Flip to 'error' when it reaches zero.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
