import { SetMetadata } from '@nestjs/common';
import { Roles } from '../enums/role.enum';

export const ROLES_KEY = 'role'
export const Role = (...roles: Roles[]) => SetMetadata(ROLES_KEY, roles);
