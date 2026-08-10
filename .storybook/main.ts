import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  stories: ['./src/**/*.stories.@(ts|html)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
};

export default config;