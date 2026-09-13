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
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SKIP_TIMEOUT_KEY } from '../decorators/skip-timeout.decorator';
import type { Configuration } from '../types';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Configuration>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipTimeout = this.reflector.getAllAndOverride<boolean>(
      SKIP_TIMEOUT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTimeout) {
      return next.handle();
    }

    const requestTimeout = this.config.get('requestTimeout', { infer: true });
    if (!requestTimeout || requestTimeout < 1_000) {
      throw new Error('SERVER_REQUEST_TIMEOUT must be at least 1000ms');
    }

    return next.handle().pipe(
      timeout(requestTimeout),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timed out after ${requestTimeout}ms`,
              ),
          );
        }
        if (err instanceof HttpException) return throwError(() => err);
        return throwError(
          () => new InternalServerErrorException((err as Error)?.message),
        );
      }),
    );
  }
}
