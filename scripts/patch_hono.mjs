#!/usr/bin/env node
// In Hono's escapeToBuffer implementation, `buffer[0] += chunk` triggers SC9001
// under scriptc if buffer[0] is uninitialized. We ensure buffer[0] is initialized.
import fs from "node:fs";

const file = process.argv[2] || "node_modules/hono/dist/utils/html.js";
if (!fs.existsSync(file)) {
  console.error(`patch_hono: file not found: ${file}`);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");
const targetRegex = /buffer\[0\] \+= /g;
const matches = content.match(targetRegex);

if (!matches || matches.length === 0) {
  if (content.includes('buffer[0] = (buffer[0] || "") + ')) {
    console.log(`patch_hono: already patched in ${file}`);
    process.exit(0);
  }
  console.error(`patch_hono: target pattern /buffer\\[0\\] \\+= / not found in ${file}`);
  process.exit(1);
}

content = content.replace(targetRegex, 'buffer[0] = (buffer[0] || "") + ');
fs.writeFileSync(file, content, "utf8");
console.log(`patch_hono: successfully patched ${matches.length} occurrences in ${file}`);
