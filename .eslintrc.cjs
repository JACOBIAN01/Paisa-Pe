const { layers, ownPackageOnly, testExtra } = require('./tools/gen/layers.json');

const elements = Object.keys(layers).map((type) => {
  const single = ['design-system', 'harness', 'tools'].includes(type);
  return {
    type,
    pattern: single ? type : `${type}/*`,
    mode: 'folder',
    ...(ownPackageOnly.includes(type) ? { capture: ['pkg'] } : {}),
  };
});

function layerRules(extra) {
  return Object.entries(layers).map(([from, allowed]) => ({
    from,
    allow: [
      ...new Set([...allowed, ...extra]),
      ...(ownPackageOnly.includes(from) ? [[from, { pkg: '${from.pkg}' }]] : []),
    ],
  }));
}

const elementTypes = (extra) => [
  'error',
  {
    default: 'disallow',
    message: '${file.type} must not import ${dependency.type}',
    rules: layerRules(extra),
  },
];

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'boundaries', 'import', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { es2022: true, node: true, jest: true },
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.base.json' },
      node: true,
    },
    'boundaries/elements': elements,
    'boundaries/include': [
      'contracts/**',
      'core/**',
      'platform/**',
      'mockplatform/**',
      'services/**',
      'features/**',
      'design-system/**',
      'apps/**',
      'harness/**',
      'tools/**',
    ],
  },
  ignorePatterns: ['node_modules', 'private', 'dist', '.expo', '.turbo', 'coverage', '*.cjs'],
  rules: {
    'boundaries/element-types': elementTypes([]),
    'import/no-relative-packages': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: ['@pp/*/*'], message: 'Import packages by name only; no deep imports.' },
        ],
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: { 'boundaries/element-types': elementTypes(testExtra) },
    },
  ],
};
