#!/usr/bin/env node
/**
 * Creates payment-body.devnet.json — the JSON file your server returns on HTTP 402.
 * Run: set SELLER_WALLET (+ RESOURCE_URL, PAYMENT_AMOUNT) in .env, then npm run enrich
 */
import { writeFileSync } from "node:fs";

const facilitator = (
  process.env.FACILITATOR_URL ?? "https://preview.ipay.sh/api/v1/facilitator"
).replace(/\/$/, "");
const sellerWallet = process.env.SELLER_WALLET;
const resourceUrl =
  process.env.RESOURCE_URL ??
  "https://your-app.vercel.app/api/v1/weather?city=Atlanta";
const amount = process.env.PAYMENT_AMOUNT ?? "50000";
const outPath = process.env.PAYMENT_BODY_PATH ?? "payment-body.devnet.json";

if (!sellerWallet) {
  console.error("Set SELLER_WALLET (your Solana pubkey base58)");
  process.exit(2);
}

const capsRes = await fetch(`${facilitator}/capabilities`, {
  headers: { Accept: "application/json" },
});
if (!capsRes.ok) {
  console.error("capabilities failed:", capsRes.status, await capsRes.text());
  process.exit(1);
}
const caps = await capsRes.json();
const network =
  caps.solanaNetwork ??
  caps.network ??
  caps.exact?.network ??
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const asset =
  caps.usdcMint ??
  caps.asset ??
  caps.exact?.usdcMint ??
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const draft = {
  x402Version: 2,
  resource: { url: resourceUrl },
  accepts: [
    {
      scheme: "exact",
      network,
      payTo: sellerWallet,
      asset,
      amount,
      maxTimeoutSeconds: 300,
    },
  ],
};

const enrichRes = await fetch(`${facilitator}/payment-required/enrich`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify(draft),
});
const text = await enrichRes.text();
if (!enrichRes.ok) {
  console.error("enrich failed:", enrichRes.status, text);
  process.exit(1);
}

const enriched = JSON.parse(text);
writeFileSync(outPath, JSON.stringify(enriched, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
console.log("payTo:", enriched.accepts?.[0]?.payTo);
