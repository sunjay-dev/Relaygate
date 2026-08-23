# Hono Proxy Server

Production-ready generic outbound HTTP proxy server built with Hono, TypeScript, and Node.js.

## Installation

```bash
pnpm install
cp .env.example .env
# Edit .env with your values
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Production

```bash
pnpm build
pnpm start
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server listen port |
| `PROXY_TOKEN` | (required) | Bearer token for authentication |
| `PROXY_TIMEOUT_MS` | `30000` | Upstream request timeout in ms |
| `PROXY_BODY_LIMIT` | `2mb` | Max request body size |
| `PROXY_ALLOWED_HOSTS` | (empty = all) | Comma-separated allowlist of target hostnames |

## API

### Health Check

```
GET /health
```

Response:

```json
{ "status": "ok" }
```

### Proxy

```
POST /proxy
Authorization: Bearer <PROXY_TOKEN>
Content-Type: application/json
```

Request body:

```json
{
  "url": "https://api.example.com/users",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer xxx",
    "Content-Type": "application/json"
  },
  "body": {
    "name": "John"
  }
}
```

- `method` defaults to `GET`. Supported: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
- `headers` are optional custom upstream headers.
- `body` is optional. Objects are JSON-serialized. Not sent for `GET`/`HEAD`.

Response: upstream status code and body forwarded.

## Security Considerations

- **Authentication**: All `/proxy` requests require `Authorization: Bearer <PROXY_TOKEN>`. Uses constant-time comparison.
- **HTTPS only**: Only `https://` target URLs are allowed.
- **SSRF protection**: Requests to private/internal IPs (localhost, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, IPv6 loopback) are blocked. DNS resolution is validated before connecting.
- **Hostname allowlist**: Optionally restrict which target hostnames are permitted via `PROXY_ALLOWED_HOSTS`.
- **Header stripping**: Hop-by-hop and request-specific headers (`host`, `connection`, `transfer-encoding`, etc.) are stripped from upstream requests. The proxy auth header is never forwarded.
- **Payload limits**: Configurable body size limit protects against oversized requests.
- **No CORS**: The proxy is server-to-server only. No `Access-Control-Allow-Origin` headers.
- **No secrets in logs**: Authorization headers, API keys, cookies, and the proxy token are never logged.

## Example Next.js Integration

```ts
const response = await fetch(
  `${process.env.PROXY_URL}/proxy`,
  {
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
  }
);

const data = await response.json();
```

The external API key stays server-side and is never exposed to the browser.
