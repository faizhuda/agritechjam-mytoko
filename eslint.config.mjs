// Flat ESLint config for ESLint v9+
import next from 'eslint-config-next';

export default [
  // Apply Next.js core-web-vitals rules for JS/TS/React
  ...next,
  // Project-specific tweaks and ignore patterns
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'out/**',
      'coverage/**',
      'supabase/**',
      '**/*.config.*',
    ],
    rules: {
      // Relax a couple of rules to avoid blocking on common patterns; tighten later as needed
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      // Make new react-hooks rules non-blocking for now
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-anonymous-default-export': 'off',
    },
  },
];
