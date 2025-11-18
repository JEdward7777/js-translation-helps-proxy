import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // Main entry points
    'src/openai-api/index.ts',
    'src/mcp-server/index.ts',
    'src/llm-helper/index.ts',
    'src/core/index.ts',  // Public API entry point
    
    // Scripts
    'scripts/**/*.ts',
    
    // Test files
    'tests/**/*.test.ts',
  ],
  project: [
    'src/**/*.ts',
    'tests/**/*.ts',
    'scripts/**/*.ts',
  ],
  ignore: [
    // Build output
    'dist/**',
    
    // Test data
    'test-data/**',
    
    // Examples (documentation)
    'examples/**/*.ts',
  ],
  ignoreDependencies: [
    // ESLint TypeScript plugins (used in .eslintrc.json)
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    '@typescript-eslint/eslint-config-recommended',
    
    // Vitest coverage (optional dev dependency)
    '@vitest/coverage-v8',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;