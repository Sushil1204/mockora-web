import { ApiError } from "./api";

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) {
    return {};
  }

  const fields = error.details.fields;

  if (!Array.isArray(fields)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const field of fields) {
    if (
      field &&
      typeof field === "object" &&
      "path" in field &&
      "message" in field &&
      typeof field.path === "string" &&
      typeof field.message === "string" &&
      !result[field.path]
    ) {
      result[field.path] = field.message;
    }
  }

  return result;
}
