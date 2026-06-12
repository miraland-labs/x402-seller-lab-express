#!/usr/bin/env node
/**
 * Tests your API URL: unpaid call must return HTTP 402.
 * Run: npm run verify-402 -- "https://your-origin.com/your/path"
 */
const url = process.argv[2];
if (!url) {
  console.error('Usage: npm run verify-402 -- "https://your-api.com/your/route"');
  process.exit(2);
}

const res = await fetch(url, { headers: { Accept: "application/json" } });
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  console.error("Non-JSON response:", text.slice(0, 300));
  process.exit(1);
}

console.log(`HTTP ${res.status} (${res.status === 402 ? "PASS gate" : "FAIL"})`);

if (res.status !== 402) {
  console.error("Expected 402 Payment Required");
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

const accept = body.accepts?.[0];
if (!accept) {
  console.error("Missing accepts[0]");
  process.exit(1);
}

const payTo = accept.payTo ?? "";
const merchant = accept.extra?.merchantWallet ?? "";
if (payTo && merchant && payTo === merchant) {
  console.error("FAIL: payTo equals bare merchant wallet — run enrich, do not use draft body");
  process.exit(1);
}

if (body.x402Version !== 2) {
  console.error("FAIL: expected x402Version 2");
  process.exit(1);
}

console.log("PASS: 402 with enriched x402 v2 body");
console.log("  scheme:", accept.scheme);
console.log("  amount:", accept.amount);
console.log("  payTo:", payTo.slice(0, 12) + "…");
