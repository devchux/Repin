import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SKIP_TIMEOUT_KEY } from '../decorators/skip-timeout.decorator';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipTimeout = this.reflector.getAllAndOverride<boolean>(
      SKIP_TIMEOUT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTimeout) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(5000),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException(err?.message));
        }
        if (err instanceof HttpException) return throwError(() => err);
        return throwError(
          () => new InternalServerErrorException((err as Error)?.message),
        );
      }),
    );
  }
}
