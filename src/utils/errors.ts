export class ProxyError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
  ) {
    super(message);
    this.name = "ProxyError";
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
  return err instanceof ProxyError;
}
