# x402 Seller Lab

**Simple goal:** make one existing API endpoint payable with pr402/x402.

This lab uses a Weather API only as an example. Your real product is your own API.

Start here, not `x402-seller-starter`. This lab is **TypeScript + Express**. `x402-seller-starter` is a separate **Rust** starter with the same payment idea.

This lab uses **preview.ipay.sh + Solana Devnet + Devnet USDC**. Later, production uses **ipay.sh + Solana Mainnet + real USDC**.

## What You Will Do

Follow the same seller path shown on [preview.ipay.sh](https://preview.ipay.sh/#seller-lifecycle):

| Step | Do this |
|------|---------|
| **1** | Make your API return **402 Payment Required** when unpaid |
| **2** | Skip Preview vault addresses (optional) |
| **3** | **Activate** your payment vault |
| **4** | Register your shop |
| **5** | Add your API URL |
| **6** | Let preview.ipay.sh verify your 402 |

**Done:** your API appears in the preview.ipay.sh directory.

## Why Activate?

Activate is the win-win path.

| If you Activate first | If you skip Activate |
|-----------------------|----------------------|
| pr402 protocol fee: **90 bps** (0.90%) | pr402 protocol fee: **100 bps** (1.00%) |
| You create the vault once with your wallet | Facilitator creates it during first payment |
| Cheaper for you, cleaner for pr402 | Works, but costs more |

You need a little Devnet SOL for Activate.

## Words You Need

| Word | Meaning |
|------|---------|
| **402** | HTTP response that means “payment required” |
| `payment-body.devnet.json` | File your API returns when the caller has not paid |
| `npm run enrich` | Creates `payment-body.devnet.json` |
| `npm run verify-402` | Checks your URL returns 402 |

## A. Wallet

1. Install a browser wallet extension: [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/). Use the Chrome / browser extension, not the mobile wallet.
2. Switch the wallet to **Solana Devnet**.
3. Copy your wallet address.
4. Get Devnet SOL: [faucet.solana.com](https://faucet.solana.com/) → paste wallet → airdrop 1-2 SOL.
5. Optional: get Devnet USDC at [faucet.circle.com](https://faucet.circle.com/) → USDC → Solana Devnet.

## B. Local 402 Test

```bash
cd x402-seller-lab-express
npm install
cp env.example .env
```

Open `.env` and set:

```bash
SELLER_WALLET=YOUR_BROWSER_WALLET_DEVNET_ADDRESS
```

Terminal 1:

```bash
export $(grep -v '^#' .env | xargs)
npm run enrich
npm run dev
```

Wait for:

```text
listening on http://localhost:3000
```

Terminal 2:

```bash
cd x402-seller-lab-express
npm run verify-402 -- "http://localhost:3000/api/v1/weather?city=Atlanta"
```

You must see:

```text
PASS: 402 with enriched x402 v2 body
```

Good. Your payment gate works locally.

## C. Public HTTPS URL

preview.ipay.sh needs a public `https://` URL, not `localhost`. Use any host: Vercel, Cloudflare, Railway, AWS, your own server.

1. Deploy once to get your public URL.
2. Put that URL in `.env`:

```bash
RESOURCE_URL=https://YOUR-DOMAIN/api/v1/weather?city=Atlanta
```

3. Regenerate the payment file:

```bash
export $(grep -v '^#' .env | xargs)
npm run enrich
```

4. Deploy again so the server has the new `payment-body.devnet.json`.
5. Test the live URL:

```bash
npm run verify-402 -- "https://YOUR-DOMAIN/api/v1/weather?city=Atlanta"
```

You must see `PASS`.

<details>
<summary>Vercel example</summary>

```bash
npx vercel@latest --yes
```

Copy the Vercel URL into `RESOURCE_URL`, then:

```bash
export $(grep -v '^#' .env | xargs)
npm run enrich
npx vercel@latest --yes
npm run verify-402 -- "https://YOUR-VERCEL-URL/api/v1/weather?city=Atlanta"
```

</details>

## D. preview.ipay.sh (Devnet)

Open [preview.ipay.sh/#seller-lifecycle](https://preview.ipay.sh/#seller-lifecycle). Use the same wallet throughout.

1. **Step 3 Activate**: connect your browser wallet → click **activate** → sign.
2. **Step 4 Register shop**: website = `https://YOUR-DOMAIN` only, no `/api/...` path → sign.
3. **Step 5 Add API**: open [preview.ipay.sh/resources](https://preview.ipay.sh/resources) → paste the full `RESOURCE_URL` → list publicly → sign.
4. **Step 6 Verify**: wait about 1 minute → check [preview.ipay.sh/#directory](https://preview.ipay.sh/#directory).

**Lab complete.**

## E. Add This To Your Real API

If your API is TypeScript / Node / Express:

1. Copy `src/x402-bridge.ts` into your project.
2. Copy `scripts/enrich-402-body.mjs` into your project.
3. Copy `scripts/verify-402.mjs` into your project.
4. Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "enrich": "node scripts/enrich-402-body.mjs",
    "verify-402": "node scripts/verify-402.mjs"
  }
}
```

5. Add the same `.env` values:

```bash
SELLER_WALLET=YOUR_BROWSER_WALLET_DEVNET_ADDRESS
FACILITATOR_URL=https://preview.ipay.sh/api/v1/facilitator
RESOURCE_URL=https://YOUR-DOMAIN/api/v1/YOUR-ROUTE
PAYMENT_BODY_PATH=payment-body.devnet.json
PAYMENT_AMOUNT=50000
```

6. Wrap one route:

```ts
import { requireX402Payment } from "./x402-bridge.js";

app.get("/api/v1/YOUR-ROUTE", requireX402Payment(async (req, res) => {
  res.json(await yourExistingHandler(req));
}));
```

7. Run the same path again: **enrich → deploy → verify-402 → Activate → Register → Add API**.

For Python, Go, Java, or Production/Mainnet notes, read [`ADVANCED.md`](./ADVANCED.md).

## Production / Mainnet Pricing Note

- Recommended minimum price: **$0.05 USDC** per call.
- Protocol fee floor: **$0.01 USDC** per payment.
- Activate before listing: pr402 Facilitator charges **90 bps** (0.90%) protocol fee.
- Skip Activate: pr402 Facilitator charges **100 bps** (1.00%) JIT tier.
