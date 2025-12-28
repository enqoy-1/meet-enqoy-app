import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    console.log('[RolesGuard] Required roles:', requiredRoles);
    console.log('[RolesGuard] User:', user ? { id: user.id, email: user.email } : 'undefined');
    console.log('[RolesGuard] User roles:', user?.roles);

    if (!user || !user.roles) {
      console.log('[RolesGuard] DENIED: No user or no roles');
      return false;
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles.some((userRole: any) => userRole.role === role),
    );

    console.log('[RolesGuard] Has required role:', hasRole);
    return hasRole;
  }
}

