// Assertions run against a live relaygate server.
// Usage: node scripts/smoke-check.mjs http://127.0.0.1:4187 <token>
const base = process.argv[2] ?? "http://127.0.0.1:4187";
const token = process.argv[3] ?? "smoketest-token";

let failures = 0;

async function check(name, expectedStatus, response, expectBody) {
  const status = response.status;
  const text = await response.text();
  const bodyOk = expectBody ? text.includes(expectBody) : true;
  const ok = status === expectedStatus && bodyOk;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${status} ${text.slice(0, 120)}`);
  if (!ok) {
    console.log(`     expected status ${expectedStatus}${expectBody ? ` and body containing ${JSON.stringify(expectBody)}` : ""}`);
    failures += 1;
  }
}

function post(path, body, auth) {
  const headers = { "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${token}`;
  return fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
}

const checks = [
  ["health", fetch(base + "/health"), 200, '"status"'],
  ["no-auth", post("/proxy", { url: "https://example.com" }, false), 401, "Unauthorized"],
  ["http-blocked", post("/proxy", { url: "http://example.com" }, true), 400, "HTTPS"],
  ["ssrf-blocked", post("/proxy", { url: "https://127.0.0.1/" }, true), 500, "Internal server error"],
  ["proxy example.com", post("/proxy", { url: "https://example.com" }, true), 200, ""],
];

for (const [name, promise, status, body] of checks) {
  try {
    const response = await promise;
    await check(name, status, response, body);
  } catch (err) {
    console.log(`FAIL ${name}: ${String(err)}`);
    failures += 1;
  }
}

if (failures > 0) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all checks passed");
