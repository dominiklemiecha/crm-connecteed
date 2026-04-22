import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific granular permissions on an endpoint.
 * Usage: @RequirePermission('leads.read', 'leads.write')
 * User must have ALL listed permissions set to true.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
