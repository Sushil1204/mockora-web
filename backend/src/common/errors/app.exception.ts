import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: HttpStatus,
    readonly details: Record<string, unknown> = {},
  ) {
    super({ error: { code, message, details } }, status);
  }
}
