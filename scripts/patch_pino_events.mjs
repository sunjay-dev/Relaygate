#!/usr/bin/env node
// pino builds loggers with Object.create(prototype) and never runs the
// EventEmitter constructor, so `_events` is undefined. Node's emit tolerates
// that; scriptc's island shim does `this._events[n]` and throws
// (TypeError: cannot read property 'level-change' of undefined) the moment
// pino's level setter emits. Initialize `_events` per instance.
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/patch_pino_events.mjs <path/to/pino/lib/proto.js>");
  process.exit(1);
}
let text = fs.readFileSync(file, "utf8");

const patches = [
  [
    `module.exports = function () {
  return Object.create(prototype)
}`,
    `module.exports = function () {
  const instance = Object.create(prototype)
  instance._events = Object.create(null)
  return instance
}`,
  ],
  [
    `  const instance = Object.create(this)`,
    `  const instance = Object.create(this)
  instance._events = Object.create(null)`,
  ],
];

for (const [from, to] of patches) {
  if (!text.includes(from)) {
    console.error(`pattern not found in ${file}: ${from.slice(0, 50)}`);
    process.exit(1);
  }
  text = text.replace(from, to);
}
fs.writeFileSync(file, text);
console.log(`patched ${file}`);
