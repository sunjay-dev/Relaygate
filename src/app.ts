import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { authMiddleware } from "./middleware/auth.js";
import { proxyHandler, handleProxyError } from "./proxy/handler.js";
import { logger } from "./utils/logging.js";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/proxy", authMiddleware, async (c) => {
  try {
    return await proxyHandler(c);
  } catch (err: unknown) {
    return handleProxyError(err, c);
  }
});

app.onError((err, c) => {
  logger.error({ err }, "unhandled_error");
  return c.json({ error: "Internal server error" }, 500);
});

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    logger.info({ port: info.port }, "server_started");
  },
);
