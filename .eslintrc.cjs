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
        // QA-1 FIX: Enabled as warn — audit showed 'off' was hiding type unsafety in financial code.
        // Service layer and repository types should be progressively strengthened.
        // Test files and Supabase generated types are exempted via overrides below.
        '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    overrides: [
        {
            // Supabase Edge Functions use Deno — console.log is standard there
            files: ['supabase/functions/**/*.ts'],
            rules: {
                'no-console': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
        {
            // Test files — allow any for mock objects and spy types
            files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
        {
            // Generated DB types — entirely auto-generated, not hand-written
            files: ['src/types/database.types.ts'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
    ],
};
