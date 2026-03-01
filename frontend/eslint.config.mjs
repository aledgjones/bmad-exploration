import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierPlugin from 'eslint-plugin-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Add Prettier integration manually, avoiding plugin:prettier notation that
  // sometimes fails to resolve in workspace hoisting scenarios.
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // enforce same brace spacing as Prettier
      'prettier/prettier': ['error', { bracketSpacing: true }],
      // only require spaces when there is at least one property (empty braces remain {} )
      'object-curly-spacing': ['error', 'always', { minProperties: 1 }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
