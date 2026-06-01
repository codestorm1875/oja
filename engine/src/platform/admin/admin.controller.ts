import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AdminService)
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get an admin snapshot of tenants, plugins, events, and audit logs.' })
  snapshot(@Req() _req: any): unknown {
    return this.adminService.snapshot();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List tenant runtime configurations.' })
  listTenants(@Req() _req: any): unknown {
    return {
      tenants: this.adminService.listTenants(),
    };
  }

  @Get('tenants/:tenantId')
  @ApiOperation({ summary: 'Get tenant configuration and enabled plugins.' })
  getTenant(@Param('tenantId') tenantId: string): unknown {
    return this.adminService.getTenant(tenantId);
  }

  @Get('plugins')
  @ApiOperation({ summary: 'List all registered plugin definitions.' })
  listPlugins(): unknown {
    return {
      plugins: this.adminService.snapshot().plugins,
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'List recent in-process plugin events.' })
  listEvents(): unknown {
    return {
      recentEvents: this.adminService.snapshot().recentEvents,
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List recent audit log entries.' })
  listAuditLogs(): unknown {
    return {
      auditLogs: this.adminService.listAuditLogs(),
    };
  }

  @Get('tenants/:tenantId/audit-logs')
  @ApiOperation({ summary: 'List audit log entries for one tenant.' })
  listTenantAuditLogs(@Param('tenantId') tenantId: string): unknown {
    return {
      tenantId,
      auditLogs: this.adminService.listTenantAuditLogs(tenantId),
    };
  }
}
