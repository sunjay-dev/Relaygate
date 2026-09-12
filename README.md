# Relaygate

<p align="center">
  <img src=".github/assets/relaygate.png" alt="Relaygate logo" width="360">
</p>

A small, authenticated outbound HTTPS proxy built with Hono, TypeScript, and Node.js. It gives trusted server-side applications one controlled route for calling third-party HTTP APIs while keeping upstream credentials out of browser code. It also provides a stable outbound egress point: requests sent through Relaygate appear to upstream services from the public IP address of its host or network egress gateway.

The project is intended for server-to-server use. It is not an open proxy and does not add CORS headers.

It can help an application work around an upstream API's CORS restriction, but only indirectly: the browser calls your application backend, and that trusted backend calls Relaygate. Do not expose Relaygate directly to arbitrary browser clients or give them a shared proxy token.

## Common use cases

- Give serverless functions or workloads spread across changing infrastructure one stable IP address that an upstream API can allowlist.
- Meet company network policy by routing approved outbound API traffic through a centrally hosted service.
- Keep third-party API credentials in backend infrastructure and use Relaygate as the controlled outbound path.
- Call an upstream API from your backend when the upstream does not permit browser-origin requests through CORS.

For a truly fixed address, deploy Relaygate behind a static public IP or a network egress gateway with one. The IP that an upstream service sees is determined by Relaygate's hosting network, NAT, load balancer, and egress configuration.

## Highlights

- One authenticated `POST /proxy` endpoint with constant-time bearer-token comparison
- A single, predictable outbound IP for serverless, distributed, or policy-constrained workloads
- HTTPS-only destinations and an optional exact-host allowlist
- Private, loopback, link-local, carrier-grade NAT, and selected IPv6 address checks before a request is made
- Configurable upstream timeout and structured JSON logs via Pino
- Request header filtering and a small, explicit response-header allowlist
- Streaming upstream response bodies instead of buffering them in application code
- TypeScript source, a multi-stage Dockerfile, Docker Compose configuration, and an ARM64 image workflow

In the maintainer's long-running deployment, the idle process has used about 30 MiB of memory over roughly three months. Treat that as an observed deployment characteristic, not a resource guarantee: actual use depends on Node.js version, traffic, response sizes, DNS, and container limits.

## Requirements

- Node.js 24 or newer
- pnpm 10 (Corepack is supported)

## Quick start

```bash
git clone https://github.com/sunjay-dev/relaygate.git
cd relaygate
corepack enable
pnpm install
Copy-Item .env.example .env # PowerShell
# On macOS/Linux: cp .env.example .env
```

Generate a long, random token and put it in `.env`; `change-me` is rejected when the server starts.

```bash
pnpm dev
```

The server listens on `http://localhost:4000` by default. Verify it with:

```bash
curl http://localhost:4000/health
```

## Configuration

Copy [`.env.example`](.env.example) to `.env`. The `.env` file is ignored by Git and must never be committed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | TCP port on which the server listens. |
| `PROXY_TOKEN` | required | Secret expected in `Authorization: Bearer <token>`. `change-me` is rejected. |
| `PROXY_TIMEOUT_MS` | `30000` | Maximum time, in milliseconds, to wait for an upstream response. |
| `PROXY_BODY_LIMIT` | `2mb` | Parsed at startup for future body-limit support. **It is not currently enforced by the request handler.** Enforce an ingress/body limit at your reverse proxy. |
| `PROXY_ALLOWED_HOSTS` | empty | Comma-separated, case-insensitive list of exact target hostnames. Empty permits any publicly resolvable HTTPS hostname. |
| `BASE_PATH` | empty | Optional path prefix for every route, for example `/api/v1`. It must begin with `/` and must not include query strings, fragments, or empty path segments. |
| `LOG_LEVEL` | `info` | Pino log level, for example `debug`, `info`, `warn`, or `error`. |

Example allowlist:

```dotenv
PROXY_ALLOWED_HOSTS=api.github.com,api.stripe.com
```

Subdomains are not implicitly included: allowing `example.com` does not allow `api.example.com`.

### Optional API base path

Set `BASE_PATH` to mount Relaygate below an API prefix:

```dotenv
BASE_PATH=/api/v1
```

With this setting, the routes become `GET /api/v1/health` and `POST /api/v1/proxy`. Leave `BASE_PATH` empty to keep the default `GET /health` and `POST /proxy` routes. A trailing slash is accepted and normalized.

## API

### Health check

```http
GET /health
```

```json
{ "status": "ok" }
```

This route is deliberately unauthenticated so it can be used by an orchestrator or load balancer.

### Send a proxied request

```http
POST /proxy
Authorization: Bearer <PROXY_TOKEN>
Content-Type: application/json
```

```json
{
  "url": "https://api.example.com/v1/users",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer upstream-secret",
    "Accept": "application/json"
  },
  "body": {
    "name": "Ada"
  }
}
```

Request fields:

| Field | Required | Details |
| --- | --- | --- |
| `url` | yes | Absolute `https://` URL. |
| `method` | no | Defaults to `GET`. Allowed values: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. |
| `headers` | no | String-to-string headers passed to the upstream after filtering. |
| `body` | no | A string or JSON-serializable object. It is omitted for `GET` and `HEAD`; object bodies are JSON-encoded. |

Example:

```bash
curl --request POST http://localhost:4000/proxy \
  --header 'Authorization: Bearer replace-with-your-token' \
  --header 'Content-Type: application/json' \
  --data '{"url":"https://httpbin.org/get","method":"GET"}'
```

The upstream status and response body are returned as-is. The proxy passes through only these response headers when present: `content-type`, `cache-control`, `etag`, `last-modified`, `content-length`, `content-disposition`, and common `x-ratelimit-*` headers.

## Errors

Errors use this shape:

```json
{ "error": "Human-readable message" }
```

Typical status codes are `400` for invalid requests or disallowed targets, `401` for a missing or invalid proxy token, `502` when the upstream cannot be reached, and `504` for an upstream timeout. Unexpected failures return `500` without internal details.

## Security model and deployment guidance

This service reduces risk for trusted callers; it is not a substitute for network egress controls.

- The proxy token protects `/proxy`, and it is never forwarded upstream. Keep it in a secret manager or deployment environment rather than source control.
- Only HTTPS targets are accepted. Request-specific and hop-by-hop headers such as `Host`, `Connection`, `Content-Length`, `Transfer-Encoding`, and `Proxy-Authorization` are removed before forwarding.
- The target hostname is checked before DNS lookup. A resolved private IP is rejected. Use `PROXY_ALLOWED_HOSTS` in production whenever the upstreams are known.
- DNS is validated before `fetch`, but the runtime performs the connection separately. For strong protection against DNS rebinding and egress bypass, also restrict outbound network access at the firewall, container, VPC, or proxy layer.
- No rate limiting is built in. Apply request-size limits, rate limits, and authentication/authorization appropriate to your callers at a reverse proxy or API gateway.
- Upstream credentials supplied in `headers` are intentionally sent upstream. Do not let untrusted clients control the target URL or headers.
- Logs include method, hostname, path, upstream status, duration, and success state. They do not deliberately log authorization headers, cookies, bodies, or proxy tokens; avoid putting secrets in URL paths or query strings because the path is logged.

## Build and run

```bash
pnpm build
pnpm start
```

Run type checking without emitting files:

```bash
pnpm typecheck
```

### Docker

```bash
docker build -t relaygate .
docker run --rm -p 4000:4000 --env-file .env relaygate
```

The included [`compose.yaml`](compose.yaml) is configured to run `sunjay195/relaygate:latest` on host port `4200`, with an HTTP health check and `unless-stopped` restart policy:

```bash
docker compose up -d
docker compose logs -f server
```

To build locally with Compose, uncomment its `build` section and either replace the `image` value or build/tag the same image name.

## Use from a server-side application

```ts
const response = await fetch(`${process.env.PROXY_URL}/proxy`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.PROXY_TOKEN}`,
  },
  body: JSON.stringify({
    url: "https://api.example.com/v1/data",
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}`,
    },
  }),
});

if (!response.ok) throw new Error(`Proxy request failed: ${response.status}`);
const data = await response.json();
```

Keep this code on the server. This pattern lets your backend call an upstream API that does not allow browser-origin requests, while keeping upstream credentials and the Relaygate token out of the browser. Browsers should call your application backend, not Relaygate directly.

## Development notes

`pnpm dev` watches TypeScript output and restarts Node when the compiled application changes. There is currently no automated test suite; contributions should include focused tests with behavior changes.

The source is separated by responsibility:

- `src/app.ts` creates and configures the Hono application.
- `src/route.ts` defines the health and proxy router, which `app.ts` mounts with `app.route()`.
- `src/server.ts` starts the Node.js HTTP server.

The TypeScript build emits the corresponding JavaScript files in `dist/`; production starts `dist/server.js`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, validation, pull-request, and security-reporting guidance.

## License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Sunjay Kumar.
