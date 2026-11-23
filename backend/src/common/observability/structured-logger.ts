type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function write(level: LogLevel, event: string, fields: LogFields): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  console.log(entry);
}

export const structuredLog = {
  info(event: string, fields: LogFields = {}): void {
    write("info", event, fields);
  },
  warn(event: string, fields: LogFields = {}): void {
    write("warn", event, fields);
  },
  error(event: string, fields: LogFields = {}): void {
    write("error", event, fields);
  },
};

export function serializeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}
