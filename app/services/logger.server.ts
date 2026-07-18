export type LogContext = Record<string, unknown>;
export type LogLevel = "debug" | "info" | "warn" | "error";

const RESERVED_FIELDS = new Set(["level", "message", "timestamp"]);

function normalizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    return value.map((item) => normalizeValue(item, seen));
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeValue(item, seen),
      ]),
    );
  }

  return value;
}

function normalizeContext(context: LogContext): LogContext {
  const seen = new WeakSet<object>();

  return Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !RESERVED_FIELDS.has(key))
      .map(([key, value]) => [key, normalizeValue(value, seen)]),
  );
}

function writeLog(
  level: LogLevel,
  message: string,
  context: LogContext = {},
  error?: unknown,
): void {
  const normalizedContext = normalizeContext(context);
  const payload = JSON.stringify({
    ...normalizedContext,
    ...(error === undefined
      ? {}
      : { error: normalizeValue(error, new WeakSet<object>()) }),
    level,
    message,
    timestamp: new Date().toISOString(),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    writeLog("debug", message, context);
  },
  info(message: string, context?: LogContext): void {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, context);
  },
  error(
    message: string,
    context?: LogContext,
    error?: unknown,
  ): void {
    writeLog("error", message, context, error);
  },
};
