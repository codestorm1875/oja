import type { PluginDefinition } from '../types.js';

export const cartPlugin: PluginDefinition = {
  manifest: {
    id: 'cart',
    name: 'Cart',
    version: '0.1.0',
    description: 'Maintains active shopping carts for a tenant.',
    dependencies: ['catalog'],
  },
};
