export interface ProxyLogMeta {
  method: string;
  hostname: string;
  path: string;
  upstreamStatus: number | null;
  durationMs: number;
  success: boolean;
}

function writeLog(level: string, objOrMsg: unknown, msg?: string): void {
  const time = new Date().toISOString();
  if (typeof objOrMsg === "string") {
    console.log(JSON.stringify({ level, time, msg: objOrMsg }));
  } else if (typeof objOrMsg === "object" && objOrMsg !== null) {
    console.log(
      JSON.stringify({
        level,
        time,
        ...(objOrMsg as Record<string, unknown>),
        ...(msg ? { msg } : {}),
      })
    );
  } else {
    console.log(JSON.stringify({ level, time, msg }));
  }
}

export const logger = {
  info(obj: unknown, msg?: string): void {
    writeLog("info", obj, msg);
  },
  warn(obj: unknown, msg?: string): void {
    writeLog("warn", obj, msg);
  },
  error(obj: unknown, msg?: string): void {
    writeLog("error", obj, msg);
  },
};


export function logProxyRequest(meta: ProxyLogMeta): void {
  if (meta.success) {
    logger.info(meta, "proxy_request");
  } else {
    logger.warn(meta, "proxy_request_failed");
  }
}
