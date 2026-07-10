import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/shared/types';

@Injectable()
export class SelfOrSuperUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const resourceUserId = Number(request.params.id);

    if (request.user?.isSuper || request.user?.id === resourceUserId) {
      return true;
    }

    throw new ForbiddenException('You can only access your own resource');
  }
}
