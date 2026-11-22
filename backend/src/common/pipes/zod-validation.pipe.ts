import { Injectable, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { HttpStatus } from "@nestjs/common";

import { AppException } from "../errors/app.exception";

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new AppException(
        "VALIDATION_ERROR",
        "The request contains invalid fields.",
        HttpStatus.BAD_REQUEST,
        {
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      );
    }

    return result.data;
  }
}
