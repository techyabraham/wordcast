import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
          return data;
        }

        if (data && typeof data === 'object' && 'items' in (data as Record<string, unknown>) && 'meta' in (data as Record<string, unknown>)) {
          const { items, meta, ...rest } = data as {
            items: unknown;
            meta: { page?: number; pageSize?: number; total?: number; totalPages?: number };
          } & Record<string, unknown>;

          const normalizedMeta = meta
            ? {
                page: meta.page,
                limit: meta.pageSize,
                total: meta.total,
                hasNextPage:
                  meta.page !== undefined && meta.totalPages !== undefined
                    ? meta.page < meta.totalPages
                    : undefined,
              }
            : undefined;

          return {
            success: true,
            data: { items, ...rest },
            meta: normalizedMeta,
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
