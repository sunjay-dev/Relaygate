import { Hono } from "hono";
import { config } from "./config/env.config.js";
import route from "./route.js";
import { logger } from "./utils/logging.js";

const app = config.basePath ? new Hono().basePath(config.basePath) : new Hono();

app.route("/", route);

app.onError((err, c) => {
  logger.error({ err }, "unhandled_error");
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
