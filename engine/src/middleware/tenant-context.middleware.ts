import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void): void {
    const tenantId = req.header('x-tenant-id') ?? req.headers['x-tenant-id'];
    const tenantSlug = req.header('x-tenant-slug') ?? req.headers['x-tenant-slug'];

    if (tenantId) {
      req.tenantContext = {
        id: String(tenantId),
        slug: String(tenantSlug ?? tenantId),
      };
    } else {
      req.tenantContext = null;
    }

    next();
  }
}