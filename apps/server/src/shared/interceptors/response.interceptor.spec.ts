import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './response.interceptor';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor(new Reflector());
  const context = {
    getHandler: () => TransformInterceptor,
    getClass: () => TransformInterceptor,
  } as unknown as ExecutionContext;

  it('preserves an intentional null response payload', async () => {
    const next = {
      handle: () =>
        of({ message: 'Bookmark memory found successfully', data: null }),
    } as CallHandler;

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      message: 'Bookmark memory found successfully',
      data: null,
    });
  });
});
