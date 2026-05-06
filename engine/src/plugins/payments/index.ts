import type { PluginDefinition } from '../types.js';

export const paymentsPlugin: PluginDefinition = {
  id: 'payments',
  name: 'Payments',
  version: '0.1.0',
  description: 'Abstracts payment authorization and settlement providers.',
};
