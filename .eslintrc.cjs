module.exports = {
    root: true,
    env: {
        browser: true,
        es2020: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended', 'plugin:storybook/recommended'],
    ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: ['react-refresh'],
    rules: {
        'react-hooks/exhaustive-deps': 'error',
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
        }],
        // Turned off: Supabase responses, Dexie queries, and service layers
        // use dynamic types extensively. Enforcing strict typing here would
        // require 279+ type annotations with minimal safety gain.
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    overrides: [
        {
            // Supabase Edge Functions use Deno — console.log is standard there
            files: ['supabase/functions/**/*.ts'],
            rules: {
                'no-console': 'off',
            },
        },
    ],
};
