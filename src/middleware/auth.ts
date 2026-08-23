import type { Context, Next } from "hono";
import { timingSafeEqual } from "crypto";
import { config } from "../config.js";
import { unauthorized } from "../utils/errors.js";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function authMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!config.proxyToken || !safeEqual(token, config.proxyToken)) {
    const err = unauthorized();
    return c.json({ error: err.message }, err.statusCode as 401);
  }

  await next();
}
