import { Controller, Get, Param, Req } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  snapshot(@Req() _req: any): unknown {
    return this.adminService.snapshot();
  }

  @Get('tenants')
  listTenants(@Req() _req: any): unknown {
    return {
      tenants: this.adminService.listTenants(),
    };
  }

  @Get('tenants/:tenantId')
  getTenant(@Param('tenantId') tenantId: string): unknown {
    return this.adminService.getTenant(tenantId);
  }

  @Get('plugins')
  listPlugins(): unknown {
    return {
      plugins: this.adminService.snapshot().plugins,
    };
  }

  @Get('events')
  listEvents(): unknown {
    return {
      recentEvents: this.adminService.snapshot().recentEvents,
    };
  }
}