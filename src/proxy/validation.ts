import * as v from "valibot";
import { badRequest } from "../utils/errors.js";
import { isSSRFSafe, assertSSRFSafe, validateResolvedAddresses } from "./ssrf.js";
import { config } from "../config/env.config.js";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

export const proxyRequestSchema = v.object({
  url: v.pipe(v.string(), v.url("Invalid URL")),
  method: v.optional(v.picklist(HTTP_METHODS), "GET"),
  headers: v.optional(v.record(v.string(), v.string())),
  body: v.optional(v.any()),
});

export type ProxyRequest = v.InferOutput<typeof proxyRequestSchema>;

export function parseProxyRequest(input: unknown): ProxyRequest {
  const result = v.safeParse(proxyRequestSchema, input);
  if (!result.success) {
    const message = result.issues[0]?.message ?? "Invalid request";
    throw badRequest(message);
  }
  return result.output;
}

export function validateTargetUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw badRequest("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw badRequest("Only HTTPS URLs are allowed");
  }

  if (!isSSRFSafe(parsed.hostname)) {
    throw badRequest("Invalid URL");
  }

  return parsed;
}

export async function validateTarget(parsed: URL): Promise<void> {
  assertSSRFSafe(parsed.hostname);

  if (config.allowedHosts.length > 0) {
    const hostLower = parsed.hostname.toLowerCase();
    if (!config.allowedHosts.includes(hostLower)) {
      throw badRequest("Target host is not allowed");
    }
  }

  await validateResolvedAddresses(parsed.hostname);
}

export function shouldIncludeBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}
