import { Injectable } from '@nestjs/common';
import { PluginEventBusService, type PluginEvent } from './event-bus.service.js';

export type AuditLogSource = 'plugin_event' | 'platform';

export type AuditLogEntry = {
  id: string;
  tenantId: string;
  action: string;
  source: AuditLogSource;
  actor: string;
  pluginId?: string;
  target?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};

export type AuditLogInput = {
  tenantId: string;
  action: string;
  source: AuditLogSource;
  actor?: string;
  pluginId?: string;
  target?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

@Injectable()
export class AuditLogService {
  private readonly entries: AuditLogEntry[] = [];
  private eventBusService: PluginEventBusService | null = null;

  attachEventBus(eventBusService: PluginEventBusService): void {
    if (this.eventBusService) {
      return;
    }

    this.eventBusService = eventBusService;
    this.eventBusService.subscribe('*', (event) => this.recordPluginEvent(event));
  }

  record(input: AuditLogInput): AuditLogEntry {
    const timestamp = input.timestamp ?? new Date().toISOString();
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId: input.tenantId,
      action: input.action,
      source: input.source,
      actor: input.actor ?? 'system',
      pluginId: input.pluginId,
      target: input.target,
      metadata: input.metadata ?? {},
      timestamp,
    };

    this.entries.unshift(entry);

    if (this.entries.length > 500) {
      this.entries.pop();
    }

    return entry;
  }

  listRecent(limit = 100): AuditLogEntry[] {
    return this.entries.slice(0, limit);
  }

  listForTenant(tenantId: string, limit = 100): AuditLogEntry[] {
    return this.entries
      .filter((entry) => entry.tenantId === tenantId)
      .slice(0, limit);
  }

  private recordPluginEvent(event: PluginEvent): void {
    this.record({
      tenantId: event.tenantId,
      action: event.type,
      source: 'plugin_event',
      actor: event.pluginId ?? 'plugin',
      pluginId: event.pluginId,
      metadata: event.payload,
      timestamp: event.timestamp,
    });
  }
}
