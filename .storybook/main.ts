import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/components/ui/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
  ],
  framework: '@storybook/react-vite',
};
export default config;