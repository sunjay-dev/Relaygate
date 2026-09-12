import * as v from "valibot";

const envSchema = v.pipe(
  v.object({
    PORT: v.optional(v.pipe(v.string(), v.regex(/^\d+$/)), "4000"),
    PROXY_TOKEN: v.pipe(v.string(), v.minLength(1, "PROXY_TOKEN is required")),
    PROXY_TIMEOUT_MS: v.optional(v.pipe(v.string(), v.regex(/^\d+$/)), "30000"),
    PROXY_BODY_LIMIT: v.optional(v.string(), "2mb"),
    PROXY_ALLOWED_HOSTS: v.optional(v.string(), ""),
    BASE_PATH: v.optional(v.string(), ""),
  }),
  v.check((input) => input.PROXY_TOKEN !== "change-me", "PROXY_TOKEN must be changed from default"),
);

type Env = v.InferOutput<typeof envSchema>;

function parseBodyLimit(raw: string): number {
  const match = /^(\d+)(mb|kb|gb)?$/i.exec(raw.trim());
  if (!match) return 2 * 1024 * 1024;
  const value = parseInt(match[1]!, 10);
  const unit = (match[2] ?? "").toLowerCase();
  switch (unit) {
    case "gb":
      return value * 1024 * 1024 * 1024;
    case "mb":
      return value * 1024 * 1024;
    case "kb":
      return value * 1024;
    default:
      return value;
  }
}

function parseBasePath(raw: string): string {
  const basePath = raw.trim();
  if (!basePath || basePath === "/") return "";

  if (
    !basePath.startsWith("/") ||
    basePath.includes("?") ||
    basePath.includes("#") ||
    basePath.includes("//")
  ) {
    console.error(
      "Invalid environment variables:\n  - BASE_PATH: must be an absolute path without query strings, fragments, or empty segments",
    );
    process.exit(1);
  }

  return basePath.replace(/\/+$/, "");
}

function validateEnv(): Env {
  const result = v.safeParse(envSchema, {
    PORT: process.env.PORT,
    PROXY_TOKEN: process.env.PROXY_TOKEN,
    PROXY_TIMEOUT_MS: process.env.PROXY_TIMEOUT_MS,
    PROXY_BODY_LIMIT: process.env.PROXY_BODY_LIMIT,
    PROXY_ALLOWED_HOSTS: process.env.PROXY_ALLOWED_HOSTS,
    BASE_PATH: process.env.BASE_PATH,
  });

  if (!result.success) {
    const issues = result.issues
      .map((i) => `  - ${i.path?.join(".") ?? "unknown"}: ${i.message}`)
      .join("\n");
    console.error(`Invalid environment variables:\n${issues}`);
    process.exit(1);
  }

  return result.output;
}

const env = validateEnv();

export const config = {
  port: parseInt(env.PORT, 10),
  proxyToken: env.PROXY_TOKEN,
  timeoutMs: parseInt(env.PROXY_TIMEOUT_MS, 10),
  bodyLimitBytes: parseBodyLimit(env.PROXY_BODY_LIMIT),
  basePath: parseBasePath(env.BASE_PATH),
  allowedHosts: env.PROXY_ALLOWED_HOSTS
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
} as const;
