import { Inject, Injectable } from '@nestjs/common';
import { pluginRegistry } from '../plugins/registry.js';
import type { PluginDefinition } from '../plugins/types.js';
import { TenantConfigService } from './tenant-config.service.js';

@Injectable()
export class PluginRegistryService {
  private readonly pluginsById = new Map(
    pluginRegistry.map((plugin) => [plugin.manifest.id, plugin]),
  );

  constructor(
    @Inject(TenantConfigService)
    private readonly tenantConfigService: TenantConfigService,
  ) {
    this.validateRegistry();
  }

  listAll(): PluginDefinition[] {
    return pluginRegistry;
  }

  listForTenant(tenantId: string): PluginDefinition[] {
    const enabledPlugins = new Set(
      this.tenantConfigService.getTenantConfig(tenantId).enabledPlugins,
    );

    return this.resolvePlugins(enabledPlugins);
  }

  private validateRegistry(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    for (const plugin of pluginRegistry) {
      this.validatePlugin(plugin.manifest.id, visited, visiting);
    }
  }

  private validatePlugin(
    pluginId: string,
    visited: Set<string>,
    visiting: Set<string>,
  ): void {
    if (visited.has(pluginId)) {
      return;
    }

    if (visiting.has(pluginId)) {
      throw new Error(`Circular plugin dependency detected for ${pluginId}`);
    }

    const plugin = this.pluginsById.get(pluginId);
    if (!plugin) {
      throw new Error(`Missing plugin definition for ${pluginId}`);
    }

    visiting.add(pluginId);

    for (const dependencyId of plugin.manifest.dependencies) {
      if (!this.pluginsById.has(dependencyId)) {
        throw new Error(
          `Plugin ${pluginId} depends on missing plugin ${dependencyId}`,
        );
      }

      this.validatePlugin(dependencyId, visited, visiting);
    }

    visiting.delete(pluginId);
    visited.add(pluginId);
  }

  private resolvePlugins(enabledPlugins: Set<string>): PluginDefinition[] {
    const resolved = new Map<string, PluginDefinition>();

    for (const plugin of pluginRegistry) {
      if (enabledPlugins.has(plugin.manifest.id)) {
        this.addPluginWithDependencies(plugin.manifest.id, resolved);
      }
    }

    return [...resolved.values()];
  }

  private addPluginWithDependencies(
    pluginId: string,
    resolved: Map<string, PluginDefinition>,
  ): void {
    if (resolved.has(pluginId)) {
      return;
    }

    const plugin = this.pluginsById.get(pluginId);
    if (!plugin) {
      return;
    }

    for (const dependencyId of plugin.manifest.dependencies) {
      this.addPluginWithDependencies(dependencyId, resolved);
    }

    resolved.set(pluginId, plugin);
  }
}
