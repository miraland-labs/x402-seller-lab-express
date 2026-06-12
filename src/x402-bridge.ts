/**
 * x402 payment bridge — copy this file (or equivalent) into your project.
 * Your API logic stays separate; only wire routes through `requireX402Payment`.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PaymentRequiredBody = Record<string, unknown>;

let cachedBody: PaymentRequiredBody | null = null;

function paymentBodyPath(): string {
  const path = process.env.PAYMENT_BODY_PATH ?? "payment-body.devnet.json";
  const isDevnet = facilitatorBase().includes("preview");
  if (!isDevnet && path.includes("devnet")) {
    console.warn(
      `[x402] WARNING: Running with Mainnet facilitator but PAYMENT_BODY_PATH is set to "${path}". You may be returning devnet payments.`
    );
  } else if (isDevnet && !path.includes("devnet")) {
    console.warn(
      `[x402] WARNING: Running with Devnet facilitator but PAYMENT_BODY_PATH is set to "${path}". You may be returning mainnet payments.`
    );
  }
  return path;
}

/** Cached enriched JSON from `npm run enrich` — returned on unpaid requests. */
export function loadPaymentBody(requestUrl?: string): PaymentRequiredBody {
  if (!cachedBody) {
    const path = resolve(process.cwd(), paymentBodyPath());
    const raw = readFileSync(path, "utf8");
    cachedBody = JSON.parse(raw) as PaymentRequiredBody;
  }
  if (requestUrl) {
    return {
      ...cachedBody,
      resource: {
        ...((cachedBody.resource || {}) as Record<string, unknown>),
        url: requestUrl,
      },
    };
  }
  return cachedBody;
}

export function paymentSignatureHeader(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const direct =
    headers["payment-signature"] ??
    headers["PAYMENT-SIGNATURE"] ??
    headers["Payment-Signature"];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  return null;
}

export function facilitatorBase(): string {
  return (
    process.env.FACILITATOR_URL ?? "https://preview.ipay.sh/api/v1/facilitator"
  ).replace(/\/$/, "");
}

export async function settlePayment(proofHeader: string): Promise<{
  ok: boolean;
  status: number;
  body: unknown;
}> {
  let paymentBody: unknown;
  try {
    paymentBody = JSON.parse(proofHeader);
  } catch {
    return { ok: false, status: 400, body: { error: "invalid_payment_signature_json" } };
  }

  const res = await fetch(`${facilitatorBase()}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(paymentBody),
    signal: AbortSignal.timeout(60_000),
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }
  return { ok: res.ok, status: res.status, body };
}

type PaidHandler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Wrap any Express route: unpaid → 402 + enriched body; paid → settle via pr402 → your handler.
 *
 * In your codebase, this is the only x402 wiring you need per paid route.
 */
export function requireX402Payment(handler: PaidHandler): RequestHandler {
  return async (req: Request, res: Response, _next: NextFunction) => {
    const proof = paymentSignatureHeader(
      req.headers as Record<string, string | string[] | undefined>,
    );

    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    if (!proof) {
      try {
        return res.status(402).json(loadPaymentBody(fullUrl));
      } catch (e) {
        return res.status(503).json({
          error: "payment_body_missing",
          message: "Run npm run enrich (see env.example)",
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const settled = await settlePayment(proof);
    if (!settled.ok) {
      try {
        return res.status(402).json({
          ...loadPaymentBody(fullUrl),
          settlement_error: settled.body,
        });
      } catch {
        return res.status(402).json({
          error: "settlement_failed",
          detail: settled.body,
        });
      }
    }

    await handler(req, res);
  };
}
