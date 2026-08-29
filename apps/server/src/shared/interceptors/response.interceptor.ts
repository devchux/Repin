import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: { message: string; data: T }) => {
        return {
          message: data?.message ?? 'Successful',
          data: data?.data ?? data ?? ({} as T),
        } as Response<T>;
      }),
    );
  }
}
