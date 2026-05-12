import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../services/audit-log.service.js';
import { PluginEventBusService } from '../../services/event-bus.service.js';
import { PluginRegistryService } from '../../services/plugin-registry.service.js';
import { TenantConfigService } from '../../services/tenant-config.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly tenantConfigService: TenantConfigService,
    private readonly pluginRegistryService: PluginRegistryService,
    private readonly eventBusService: PluginEventBusService,
    private readonly auditLogService: AuditLogService,
  ) {}

  listTenants(): Array<{ id: string; currency: string; region: string; enabledPlugins: string[] }> {
    return this.tenantConfigService.listTenantConfigs();
  }

  getTenant(tenantId: string): {
    id: string;
    config: ReturnType<TenantConfigService['getTenantConfig']>;
    plugins: ReturnType<PluginRegistryService['listForTenant']>;
  } {
    return {
      id: tenantId,
      config: this.tenantConfigService.getTenantConfig(tenantId),
      plugins: this.pluginRegistryService.listForTenant(tenantId),
    };
  }

  snapshot(): {
    tenants: ReturnType<AdminService['listTenants']>;
    plugins: ReturnType<PluginRegistryService['listAll']>;
    recentEvents: ReturnType<PluginEventBusService['snapshot']>['recentEvents'];
    recentAuditLogs: ReturnType<AuditLogService['listRecent']>;
  } {
    const eventSnapshot = this.eventBusService.snapshot();

    return {
      tenants: this.listTenants(),
      plugins: this.pluginRegistryService.listAll(),
      recentEvents: eventSnapshot.recentEvents,
      recentAuditLogs: this.auditLogService.listRecent(),
    };
  }

  listAuditLogs(): ReturnType<AuditLogService['listRecent']> {
    return this.auditLogService.listRecent();
  }

  listTenantAuditLogs(tenantId: string): ReturnType<AuditLogService['listForTenant']> {
    return this.auditLogService.listForTenant(tenantId);
  }
}
