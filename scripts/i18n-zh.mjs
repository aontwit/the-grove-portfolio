// Inject Simplified Chinese (`zh`) siblings right after every `en` key in src/data/*.json.
// Usage:
//   node scripts/i18n-zh.mjs extract <out.json>   -> list unique en strings
//   node scripts/i18n-zh.mjs apply <map.json>     -> write zh siblings (map: en string -> zh string)
//   node scripts/i18n-zh.mjs check                -> verify every en has a zh of identical shape
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const [, , cmd, arg] = process.argv;

const load = (f) => JSON.parse(readFileSync(join(DIR, f), "utf8"));

function walk(node, onEn) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, onEn));
  if (node && typeof node === "object") {
    if ("en" in node) onEn(node);
    for (const v of Object.values(node)) walk(v, onEn);
  }
}

function strings(v, out) {
  if (typeof v === "string") out.add(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
}

function translate(v, map, missing) {
  if (typeof v === "string") {
    if (v === "") return "";
    if (!(v in map)) missing.add(v);
    return map[v] ?? v;
  }
  if (Array.isArray(v)) return v.map((x) => translate(x, map, missing));
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, translate(x, map, missing)]));
  return v;
}

function inject(node, map, missing, count) {
  if (Array.isArray(node)) return node.map((n) => inject(n, map, missing, count));
  if (node && typeof node === "object") {
    const out = {};
    const hasEn = "en" in node;
    for (const [k, v] of Object.entries(node)) {
      if (k === "zh" && hasEn) continue; // regenerated below
      out[k] = k === "en" ? v : inject(v, map, missing, count);
      if (k === "en") {
        out.zh = translate(v, map, missing);
        count.n++;
      }
    }
    return out;
  }
  return node;
}

function sameShape(a, b) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => sameShape(x, b[i]));
  if (a && typeof a === "object") {
    if (!b) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && sameShape(a[k], b[k]));
  }
  if (typeof a === "string") return (a === "") === (b === "");
  return a === b;
}

if (cmd === "extract") {
  const set = new Set();
  for (const f of files) walk(load(f), (o) => strings(o.en, set));
  const list = [...set].filter((s) => s !== "");
  writeFileSync(arg, JSON.stringify(list, null, 2) + "\n");
  console.log(`${list.length} unique strings -> ${arg}`);
} else if (cmd === "apply") {
  const map = JSON.parse(readFileSync(arg, "utf8"));
  const missing = new Set();
  for (const f of files) {
    const count = { n: 0 };
    const raw = readFileSync(join(DIR, f), "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n"; // keep the checkout's line endings
    const out = inject(JSON.parse(raw), map, missing, count);
    writeFileSync(join(DIR, f), (JSON.stringify(out, null, 2) + "\n").replace(/\n/g, eol));
    console.log(`${f}: ${count.n} zh objects`);
  }
  if (missing.size) {
    console.error(`MISSING ${missing.size}:`, [...missing]);
    process.exit(1);
  }
} else if (cmd === "check") {
  let bad = 0;
  let total = 0;
  for (const f of files)
    walk(load(f), (o) => {
      total++;
      const keys = Object.keys(o);
      if (!("zh" in o) || !sameShape(o.en, o.zh) || keys[keys.indexOf("en") + 1] !== "zh") {
        bad++;
        console.error(`${f}: bad zh for`, JSON.stringify(o.en).slice(0, 80));
      }
    });
  console.log(`${total} en objects, ${bad} problems`);
  process.exit(bad ? 1 : 0);
} else {
  console.error("usage: extract <out> | apply <map> | check");
  process.exit(1);
}
