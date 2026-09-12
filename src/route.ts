import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth.js";
import { proxyHandler, handleProxyError } from "./proxy/handler.js";

const route = new Hono();

route.get("/health", (c) => {
  return c.json({ status: "ok" });
});

route.post("/proxy", authMiddleware, async (c) => {
  try {
    return await proxyHandler(c);
  } catch (err: unknown) {
    return handleProxyError(err, c);
  }
});

export default route;
