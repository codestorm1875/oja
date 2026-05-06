import type { PluginDefinition } from './types.js';
import { cartPlugin } from './cart/index.js';
import { catalogPlugin } from './catalog/index.js';
import { checkoutPlugin } from './checkout/index.js';
import { discountsPlugin } from './discounts/index.js';
import { inventoryPlugin } from './inventory/index.js';
import { ordersPlugin } from './orders/index.js';
import { paymentsPlugin } from './payments/index.js';

export const pluginRegistry: PluginDefinition[] = [
  catalogPlugin,
  inventoryPlugin,
  cartPlugin,
  checkoutPlugin,
  discountsPlugin,
  paymentsPlugin,
  ordersPlugin,
];
