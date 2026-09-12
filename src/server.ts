import { serve } from "@hono/node-server";
import app from "./app.js";
import { config } from "./config/env.config.js";
import { logger } from "./utils/logging.js";

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    logger.info({ port: info.port }, "server_started");
  },
);
