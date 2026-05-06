import type { PluginDefinition } from '../types.js';

export const checkoutPlugin: PluginDefinition = {
  manifest: {
    id: 'checkout',
    name: 'Checkout',
    version: '0.1.0',
    description: 'Coordinates checkout orchestration across cart and payment steps.',
    dependencies: ['cart', 'discounts', 'inventory', 'payments', 'orders'],
  },
};
