#!/usr/bin/env node
/**
 * Le `REGRAS-FIREBASE-ATUALIZADAS.json` (documentado, com `_meta`,
 * `_comment`, `_safety`, `_pii_choice`, etc) e gera `REGRAS-FIREBASE-DEPLOY.json`
 * stripado pra colar no Firebase Console.
 *
 * Stripa qualquer chave que comece com `_` MAS preserva `.read`, `.write`,
 * `.validate`, `.indexOn`, `.read`/`.write` etc (que comecam com `.`, nao `_`).
 *
 * Run: `node scripts/strip-firebase-rules-meta.js`
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const inputPath = path.join(repoRoot, "REGRAS-FIREBASE-ATUALIZADAS.json");
const outputPath = path.join(repoRoot, "REGRAS-FIREBASE-DEPLOY.json");

function strip(node) {
  if (Array.isArray(node)) return node.map(strip);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      // Strip metadata keys (underscore-prefixed) but keep Firebase rule
      // keys (dot-prefixed: .read, .write, .validate, .indexOn).
      if (k.startsWith("_") && !k.startsWith(".")) continue;
      out[k] = strip(v);
    }
    return out;
  }
  return node;
}

const raw = fs.readFileSync(inputPath, "utf8");
const data = JSON.parse(raw);
const stripped = strip(data);
fs.writeFileSync(outputPath, JSON.stringify(stripped, null, 2) + "\n");
console.log(`[strip] wrote ${path.relative(repoRoot, outputPath)}`);
