import type { PluginDefinition } from '../types.js';

export const ordersPlugin: PluginDefinition = {
  id: 'orders',
  name: 'Orders',
  version: '0.1.0',
  description: 'Persists order lifecycle state after successful checkout.',
};
