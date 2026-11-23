import { randomUUID } from "node:crypto";

import type { NextFunction, Response } from "express";

import type { RequestWithUser } from "../../auth/auth.types";
import { structuredLog } from "./structured-logger";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;
const UNLOGGED_PATHS = new Set(["/api/v1/health", "/api/v1/health/ready"]);

export function requestContext(
  request: RequestWithUser,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = request.get("x-request-id");
  const requestId =
    incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);

  const startedAt = process.hrtime.bigint();

  response.once("finish", () => {
    if (UNLOGGED_PATHS.has(request.path)) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = response.statusCode;
    const fields = {
      requestId,
      method: request.method,
      path: request.path,
      statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      userId: request.user?.id ?? null,
    };

    if (statusCode >= 500) {
      structuredLog.error("http_request", fields);
    } else if (statusCode >= 400) {
      structuredLog.warn("http_request", fields);
    } else {
      structuredLog.info("http_request", fields);
    }
  });

  next();
}

export function getRequestId(response: Response): string | undefined {
  const requestId: unknown = response.locals.requestId;
  return typeof requestId === "string" ? requestId : undefined;
}
