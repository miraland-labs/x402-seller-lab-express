# Advanced Notes

Read this after the lab works. The main path is still:

```text
enrich → deploy → verify-402 → Activate → Register → Add API
```

The lab uses **preview.ipay.sh** with **Solana Devnet** and **Devnet USDC**.
Production uses **ipay.sh** with **Solana Mainnet** and real USDC.

## Other Languages

You can use pr402/x402 from any backend.

Generate `payment-body.devnet.json` once with this lab's `npm run enrich`, then copy that file into your project.

Your server needs three rules:

1. No `PAYMENT-SIGNATURE` header  
   → return HTTP **402**  
   → body = `payment-body.devnet.json`

2. Has `PAYMENT-SIGNATURE` header  
   → parse the header value as JSON  
   → POST it to:

```text
https://preview.ipay.sh/api/v1/facilitator/settle
```

3. Settle response OK  
   → run your normal API handler

## Dynamic URLs

The 402 body contains a `resource.url`.

If your route supports different URLs, such as:

```text
/api/v1/weather?city=Atlanta
/api/v1/weather?city=Seattle
```

return the same 402 template but replace `resource.url` with the actual request URL before sending it.

This lab's `src/x402-bridge.ts` already does that.

## Price Changes

Do not manually edit `amount` inside `payment-body.devnet.json`.

If price changes, update:

```bash
PAYMENT_AMOUNT=...
```

Then run:

```bash
npm run enrich
```

Deploy the new JSON file with your app.

## Header Format

`PAYMENT-SIGNATURE` is not a simple string token.

It is a JSON string. Parse it as JSON, then send that JSON object to `/settle`.

## Production / Mainnet

When you are ready for real payments:

1. Use [ipay.sh](https://ipay.sh), not preview.ipay.sh.
2. Set:

```bash
FACILITATOR_URL=https://ipay.sh/api/v1/facilitator
SELLER_WALLET=YOUR_MAINNET_WALLET
PAYMENT_BODY_PATH=payment-body.mainnet.json
```

3. Set `RESOURCE_URL` to your production HTTPS endpoint.
4. Run:

```bash
npm run enrich
```

5. Deploy `payment-body.mainnet.json` with your API.
6. On [ipay.sh](https://ipay.sh/#seller-lifecycle), repeat:

```text
Activate → Register shop → Add API
```

## Create Payment Body Without npm

Only use this if `npm run enrich` fails.

Replace the placeholders:

```bash
curl -sS -X POST "https://preview.ipay.sh/api/v1/facilitator/payment-required/enrich" \
  -H "Content-Type: application/json" \
  -d '{
    "x402Version": 2,
    "resource": { "url": "YOUR_FULL_API_URL" },
    "accepts": [{
      "scheme": "exact",
      "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      "payTo": "YOUR_WALLET_ADDRESS",
      "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "amount": "50000",
      "maxTimeoutSeconds": 300
    }]
  }' > payment-body.devnet.json
```

Examples:

```text
YOUR_FULL_API_URL     https://my-api.example.com/api/v1/weather?city=Atlanta
YOUR_WALLET_ADDRESS  your browser wallet Devnet address
50000                $0.05 USDC
```
