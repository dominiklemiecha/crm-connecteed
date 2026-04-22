import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/auth/user.entity';
import { ROLES_KEY } from '../../modules/auth/guards/roles.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
