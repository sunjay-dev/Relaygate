export interface ProxyLogMeta {
  method: string;
  hostname: string;
  path: string;
  upstreamStatus: number | null;
  durationMs: number;
  success: boolean;
}

const LOG_LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100,
};

function shouldLog(level: string): boolean {
  const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
  const minLevel = LOG_LEVELS[envLevel] ?? 30;
  const currentLevel = LOG_LEVELS[level] ?? 30;
  return currentLevel >= minLevel;
}

function serializeError(err: unknown): Record<string, unknown> | unknown {
  if (!(err instanceof Error)) {
    return err;
  }
  const res: Record<string, unknown> = {
    type: err.name,
    message: err.message,
    stack: err.stack,
  };
  if ("code" in err && (err as { code?: unknown }).code !== undefined) {
    res.code = (err as { code?: unknown }).code;
  }
  if (err.cause) {
    res.cause = serializeError(err.cause);
  }
  return res;
}

function serializeLogData(obj: unknown): Record<string, unknown> {
  if (obj instanceof Error) {
    return { err: serializeError(obj) };
  }
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      result[key] = val instanceof Error ? serializeError(val) : val;
    }
    return result;
  }
  return { data: obj };
}

function writeLog(level: string, objOrMsg: unknown, msg?: string): void {
  if (!shouldLog(level)) return;
  const time = new Date().toISOString();
  if (typeof objOrMsg === "string") {
    console.log(JSON.stringify({ level, time, msg: objOrMsg }));
  } else {
    const data = serializeLogData(objOrMsg);
    console.log(
      JSON.stringify({
        level,
        time,
        ...data,
        ...(msg ? { msg } : {}),
      })
    );
  }
}

export const logger = {
  trace(obj: unknown, msg?: string): void {
    writeLog("trace", obj, msg);
  },
  debug(obj: unknown, msg?: string): void {
    writeLog("debug", obj, msg);
  },
  info(obj: unknown, msg?: string): void {
    writeLog("info", obj, msg);
  },
  warn(obj: unknown, msg?: string): void {
    writeLog("warn", obj, msg);
  },
  error(obj: unknown, msg?: string): void {
    writeLog("error", obj, msg);
  },
  fatal(obj: unknown, msg?: string): void {
    writeLog("fatal", obj, msg);
  },
};

export function logProxyRequest(meta: ProxyLogMeta): void {
  if (meta.success) {
    logger.info(meta, "proxy_request");
  } else {
    logger.warn(meta, "proxy_request_failed");
  }
}
