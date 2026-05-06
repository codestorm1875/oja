import type { PluginDefinition } from '../types.js';

export const catalogPlugin: PluginDefinition = {
  manifest: {
    id: 'catalog',
    name: 'Catalog',
    version: '0.1.0',
    description: 'Serves product catalog data and listing primitives.',
    dependencies: [],
  },
};
