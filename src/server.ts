import { createServer } from "node:http";
import app from "./app.js";
import { config } from "./config/env.config.js";
import { logger } from "./utils/logging.js";

type PlainRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

type PlainResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

async function dispatch(plain: PlainRequest): Promise<PlainResponse> {
  const init: RequestInit = {
    method: plain.method,
    headers: plain.headers,
    body: plain.body.length > 0 ? plain.body : undefined,
  };
  const response: any = await app.request("http://relaygate.local" + plain.url, init);
  const headers: Record<string, string> = {};
  response.headers.forEach((value: string, key: string) => {
    headers[key] = value;
  });
  return { status: response.status, headers, body: await response.text() };
}

function plainHeaders(raw: NodeJS.Dict<string | string[]>): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const key of Object.keys(raw)) {
    const value = raw[key];
    if (value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk: Buffer) => {
    body += chunk.toString("utf8");
  });
  req.on("end", () => {
    dispatch({
      url: req.url ?? "/",
      method: req.method ?? "GET",
      headers: plainHeaders(req.headers),
      body,
    })
      .then((out) => {
        res.statusCode = out.status;
        for (const key of Object.keys(out.headers)) {
          if (key === "transfer-encoding" || key === "content-length") continue;
          res.setHeader(key, out.headers[key]!);
        }
        res.end(out.body);
      })
      .catch((err: unknown) => {
        logger.error({ err: String(err) }, "dispatch_failed");
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Internal server error" }));
      });
  });
});

server.listen(config.port, () => {
  logger.info({ port: config.port }, "server_started");
});
