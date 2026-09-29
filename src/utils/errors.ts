export class ProxyError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = `ProxyError[${statusCode}]`;
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string): ProxyError {
  return new ProxyError(400, message);
}

export function unauthorized(): ProxyError {
  return new ProxyError(401, "Unauthorized");
}

export function forbidden(message: string): ProxyError {
  return new ProxyError(403, message);
}

export function gatewayTimeout(): ProxyError {
  return new ProxyError(504, "Upstream request timed out");
}

export function badGateway(message: string): ProxyError {
  return new ProxyError(502, message);
}

export function isProxyError(err: unknown): err is ProxyError {
  return err instanceof Error && err.name.startsWith("ProxyError[");
}

export function proxyStatusOf(err: Error): number | undefined {
  const name = err.name;
  if (name.length !== 15 || !name.startsWith("ProxyError[")) return undefined;
  return parseInt(name.slice(11, 14), 10);
}
