import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AppException } from "../errors/app.exception";
import { getRequestId } from "../observability/request-context.middleware";
import {
  serializeError,
  structuredLog,
} from "../observability/structured-logger";

const DEFAULT_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHENTICATED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_ERROR",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = getRequestId(response);

    if (exception instanceof AppException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
      const normalizedMessage = Array.isArray(message)
        ? message.join(", ")
        : message;

      if (status >= 500) {
        structuredLog.error("http_exception", {
          requestId: requestId ?? null,
          method: request.method,
          path: request.path,
          statusCode: status,
          error: serializeError(exception),
        });
      }

      response.status(status).json({
        error: {
          code: DEFAULT_CODES[status] ?? "HTTP_ERROR",
          message: normalizedMessage,
          details: {},
        },
      });
      return;
    }

    structuredLog.error("unhandled_exception", {
      requestId: requestId ?? null,
      method: request.method,
      path: request.path,
      error: serializeError(exception),
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        details: {},
      },
    });
  }
}
