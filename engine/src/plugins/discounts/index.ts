import type { PluginDefinition } from '../types.js';

export const discountsPlugin: PluginDefinition = {
  manifest: {
    id: 'discounts',
    name: 'Discounts',
    version: '0.1.0',
    description: 'Applies promotions, coupon rules, and pricing adjustments.',
    dependencies: ['catalog'],
  },
};
