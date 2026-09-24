import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const eslintConfig = [
  {
    ignores: ['node_modules/', '.next/', 'out/', 'public/', 'next-env.d.ts'],
  },
  ...compat.extends(
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ),
  {
    rules: {
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
          singleQuote: true,
          semi: true,
          tabWidth: 2,
          printWidth: 100,
          trailingComma: 'es5',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: ['src/test/**/*.ts', 'src/test/**/*.tsx', 'src/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Standalone Node utility scripts are CommonJS by design and run outside the
    // bundler, so `require()` is the only available module syntax.
    files: ['**/*.cjs', '**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // CLI utilities print their results to stdout — that is their whole purpose,
    // and the `no-console` rule exists to keep logging out of application code.
    // `src/lib/dbCheck.ts` belongs here too: `npm run db:check` runs it via
    // ts-node as a command, not as part of the Next.js app.
    files: ['scripts/**/*.{js,cjs,mjs,ts}', 'src/lib/dbCheck.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
