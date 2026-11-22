import { HttpStatus } from "@nestjs/common";

import { AppException } from "./errors/app.exception";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;

export function readIdempotencyKey(value: string | undefined): string | null {
  const key = value?.trim() || null;

  if (key && !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new AppException(
      "INVALID_IDEMPOTENCY_KEY",
      "Use an Idempotency-Key of 8–100 letters, numbers, dots, colons, dashes, or underscores.",
      HttpStatus.BAD_REQUEST,
    );
  }

  return key;
}
