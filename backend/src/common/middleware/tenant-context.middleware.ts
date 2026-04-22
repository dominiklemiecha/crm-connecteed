import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user?.tenantId) {
      await this.dataSource.query(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        [user.tenantId],
      );
    }
    next();
  }
}
