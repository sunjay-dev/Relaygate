import { isIPv4 } from "net";

const PRIVATE_RANGES_V4: Array<{ start: number; end: number }> = [
  { start: ipToLong("127.0.0.0"), end: ipToLong("127.255.255.255") },
  { start: ipToLong("0.0.0.0"), end: ipToLong("0.255.255.255") },
  { start: ipToLong("10.0.0.0"), end: ipToLong("10.255.255.255") },
  { start: ipToLong("100.64.0.0"), end: ipToLong("100.127.255.255") },
  { start: ipToLong("169.254.0.0"), end: ipToLong("169.254.255.255") },
  { start: ipToLong("172.16.0.0"), end: ipToLong("172.31.255.255") },
  { start: ipToLong("192.168.0.0"), end: ipToLong("192.168.255.255") },
];

function ipToLong(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0]! << 24) |
      (parts[1]! << 16) |
      (parts[2]! << 8) |
      parts[3]!) >>>
    0
  );
}

function isIPv4Private(ip: string): boolean {
  const long = ipToLong(ip);
  return PRIVATE_RANGES_V4.some((r) => long >= r.start && long <= r.end);
}

function isIPv6Private(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (isIPv4(ip)) return isIPv4Private(ip);
  return isIPv6Private(ip);
}

export function isSSRFSafe(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return false;
  if (lower === "0.0.0.0") return false;
  if (lower === "[::1]") return false;
  if (lower === "::1") return false;
  return true;
}

export function assertSSRFSafe(hostname: string): void {
  if (!isSSRFSafe(hostname)) {
    throw new Error(`SSRF blocked: hostname "${hostname}" is not allowed`);
  }
  if (isPrivateIP(hostname)) {
    throw new Error(`SSRF blocked: hostname "${hostname}" resolves to a private IP`);
  }
}

export async function validateResolvedAddresses(
  hostname: string,
): Promise<void> {
  const { lookup } = await import("dns/promises");
  try {
    const { address } = await lookup(hostname, { family: 0 });
    if (isPrivateIP(address)) {
      throw new Error(
        `SSRF blocked: "${hostname}" resolved to private IP "${address}"`,
      );
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.startsWith("SSRF blocked:")
    ) {
      throw err;
    }
    throw new Error(`Failed to resolve hostname "${hostname}"`);
  }
}
