import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export interface ProxyLogMeta {
  method: string;
  hostname: string;
  path: string;
  upstreamStatus: number | null;
  durationMs: number;
  success: boolean;
}

export function logProxyRequest(meta: ProxyLogMeta): void {
  if (meta.success) {
    logger.info(meta, "proxy_request");
  } else {
    logger.warn(meta, "proxy_request_failed");
  }
}
