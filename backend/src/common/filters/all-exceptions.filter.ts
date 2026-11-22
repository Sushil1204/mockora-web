import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

import { AppException } from "../errors/app.exception";

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
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

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

      response.status(status).json({
        error: {
          code: DEFAULT_CODES[status] ?? "HTTP_ERROR",
          message: normalizedMessage,
          details: {},
        },
      });
      return;
    }

    this.logger.error("Unhandled exception", exception as Error);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        details: {},
      },
    });
  }
}
