import { Injectable, NestMiddleware } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import pg from 'pg';

type TenantIdentity = {
  id: string;
  slug: string;
};

type TenantRecord = TenantIdentity & {
  apiKey: string;
};

const PUBLIC_PATH_PREFIXES = [
  '/healthz',
  '/docs',
  '/openapi.json',
  '/favicon.ico',
];

const GATEWAY_TENANT_PATH_CANDIDATES = [
  process.env.GATEWAY_TENANTS_FILE,
  'gateway/tenants.json',
].filter((candidate): candidate is string => Boolean(candidate));

function resolveTenantPath(): string {
  for (const candidate of GATEWAY_TENANT_PATH_CANDIDATES) {
    const resolvedPath = isAbsolute(candidate)
      ? candidate
      : resolve(process.cwd(), candidate);

    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return resolve(process.cwd(), GATEWAY_TENANT_PATH_CANDIDATES[0]);
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly tenantsByApiKey = new Map<string, TenantIdentity>();

  constructor() {
    this.loadFixtureTenants();
  }

  async use(req: any, res: any, next: () => void): Promise<void> {
    if (this.isPublicPath(req.path ?? req.url)) {
      next();
      return;
    }

    const tenantId = req.header('x-tenant-id') ?? req.headers['x-tenant-id'];
    const tenantSlug = req.header('x-tenant-slug') ?? req.headers['x-tenant-slug'];

    if (tenantId) {
      req.tenantContext = {
        id: String(tenantId),
        slug: String(tenantSlug ?? tenantId),
      };
      next();
      return;
    }

    const apiKey = String(req.header('x-api-key') ?? req.headers['x-api-key'] ?? '').trim();

    if (!apiKey) {
      res.status(401).json({
        statusCode: 401,
        message: 'missing api key',
      });
      return;
    }

    const tenant = await this.lookupTenantByApiKey(apiKey);

    if (!tenant) {
      res.status(401).json({
        statusCode: 401,
        message: 'invalid api key',
      });
      return;
    }

    req.tenantContext = tenant;
    next();
  }

  private async lookupTenantByApiKey(apiKey: string): Promise<TenantIdentity | null> {
    if (process.env.DATABASE_URL) {
      const tenant = await this.lookupTenantByApiKeyFromDatabase(apiKey);

      if (tenant) {
        return tenant;
      }
    }

    return this.tenantsByApiKey.get(apiKey) ?? null;
  }

  private async lookupTenantByApiKeyFromDatabase(
    apiKey: string,
  ): Promise<TenantIdentity | null> {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    try {
      const result = await client.query<{ tenant_id: string; slug: string }>(
        'SELECT tenant_id::TEXT, slug FROM lookup_tenant_by_api_key($1)',
        [apiKey],
      );

      const row = result.rows[0];

      return row
        ? {
            id: row.tenant_id,
            slug: row.slug,
          }
        : null;
    } finally {
      await client.end();
    }
  }

  private loadFixtureTenants(): void {
    const tenantPath = resolveTenantPath();

    if (!existsSync(tenantPath)) {
      return;
    }

    const records = JSON.parse(readFileSync(tenantPath, 'utf8')) as TenantRecord[];

    for (const record of records) {
      this.tenantsByApiKey.set(record.apiKey, {
        id: record.id,
        slug: record.slug,
      });
    }
  }

  private isPublicPath(path: string): boolean {
    return PUBLIC_PATH_PREFIXES.some((prefix) => {
      if (path === prefix) {
        return true;
      }

      return path.startsWith(`${prefix}/`);
    });
  }
}
