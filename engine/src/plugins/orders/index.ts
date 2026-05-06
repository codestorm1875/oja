import type { PluginDefinition } from '../types.js';

export const ordersPlugin: PluginDefinition = {
  manifest: {
    id: 'orders',
    name: 'Orders',
    version: '0.1.0',
    description: 'Persists order lifecycle state after successful checkout.',
    dependencies: ['catalog', 'cart'],
  },
};
