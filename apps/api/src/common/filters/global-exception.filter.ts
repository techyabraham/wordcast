import {
  type ArgumentsHost,
  Catch, ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message = typeof payload === 'string' ? payload : (payload as { message?: unknown }).message;
      const errorCode =
        typeof payload === 'object' && payload && 'errorCode' in payload
          ? String((payload as { errorCode?: unknown }).errorCode ?? `HTTP_${status}`)
          : `HTTP_${status}`;

      response.status(status).json({
        success: false,
        message: Array.isArray(message) ? message.join(', ') : message ?? 'Request failed',
        errorCode,
        details: typeof payload === 'object' ? payload : undefined,
      });
      return;
    }

    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}
