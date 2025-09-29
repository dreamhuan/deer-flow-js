import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // 1. 启用 ESLint 推荐的核心规则
  js.configs.recommended,

  // 2. 启用 TypeScript-ESLint 的推荐规则
  ...tseslint.configs.recommended,

  // 3. 启用 Prettier 插件和规则
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['node_modules/', 'dist/'],
  },

  // 4. 应用 Prettier 的兼容性配置
  prettierConfig,
];
