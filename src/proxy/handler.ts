import type { Context } from "hono";
import { config } from "../config/env.config.js";
import { isProxyError, badRequest, gatewayTimeout, badGateway } from "../utils/errors.js";
import { logger, logProxyRequest } from "../utils/logging.js";
import { parseProxyRequest, validateTargetUrl, validateTarget, shouldIncludeBody } from "./validation.js";
import type { ProxyRequest } from "./validation.js";

const REQUEST_SPECIFIC_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
]);

function filterUpstreamHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!REQUEST_SPECIFIC_HEADERS.has(lower)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

const SAFE_RESPONSE_HEADERS = new Set([
  "content-type",
  "cache-control",
  "etag",
  "last-modified",
  "content-length",
  "content-disposition",
  "x-ratelimit-requests-limit",
  "x-ratelimit-requests-remaining",
  "x-ratelimit-requests-reset",
]);

export async function proxyHandler(c: Context): Promise<Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }

  const body: ProxyRequest = parseProxyRequest(raw);

  const parsedUrl = validateTargetUrl(body.url);
  await validateTarget(parsedUrl);

  const method = body.method!;
  const upstreamHeaders = filterUpstreamHeaders(body.headers);

  let requestBody: string | undefined;
  if (shouldIncludeBody(method) && body.body != null) {
    if (typeof body.body === "object") {
      requestBody = JSON.stringify(body.body);
      if (!upstreamHeaders["content-type"]) {
        upstreamHeaders["content-type"] = "application/json";
      }
    } else if (typeof body.body === "string") {
      requestBody = body.body;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
  const startTime = Date.now();

  try {
    const upstreamResponse = await fetch(parsedUrl.href, {
      method,
      headers: upstreamHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    logProxyRequest({
      method,
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      upstreamStatus: upstreamResponse.status,
      durationMs,
      success: upstreamResponse.ok,
    });

    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (SAFE_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    logProxyRequest({
      method,
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      upstreamStatus: null,
      durationMs,
      success: false,
    });

    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) {
      throw gatewayTimeout();
    }

    throw badGateway("Failed to reach upstream server");
  }
}

export function handleProxyError(err: unknown, c: Context): Response {
  if (isProxyError(err)) {
    return c.json({ error: err.message }, err.statusCode as 400);
  }
  logger.error({ err }, "unhandled_proxy_error");
  return c.json({ error: "Internal server error" }, 500);
}
