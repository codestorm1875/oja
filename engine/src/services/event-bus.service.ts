import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type PluginEvent = {
  type: string;
  tenantId: string;
  pluginId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

@Injectable()
export class PluginEventBusService {
  private readonly emitter = new EventEmitter();
  private readonly history: PluginEvent[] = [];

  publish(event: PluginEvent): void {
    this.history.push(event);

    if (this.history.length > 100) {
      this.history.shift();
    }

    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  subscribe(
    eventType: string,
    handler: (event: PluginEvent) => void,
  ): () => void {
    this.emitter.on(eventType, handler);

    return () => this.emitter.off(eventType, handler);
  }

  snapshot(): { recentEvents: PluginEvent[] } {
    return {
      recentEvents: [...this.history],
    };
  }
}