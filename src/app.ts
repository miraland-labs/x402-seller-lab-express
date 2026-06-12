import express, { type Express, type Request, type Response } from "express";
import { requireX402Payment } from "./x402-bridge.js";
import { WeatherError, getWeather } from "./weather.js";

export function createApp(): Express {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "x402-seller-lab-express" });
  });

  // ── x402 wiring (keep) ─────────────────────────────────────────────
  app.get(
    "/api/v1/weather",
    requireX402Payment(async (req: Request, res: Response) => {
      try {
        const city = typeof req.query.city === "string" ? req.query.city : undefined;
        res.json(await getWeather(city));
      } catch (e) {
        if (e instanceof WeatherError) {
          const status = e.code === "city_not_found" ? 404 : 400;
          res.status(status).json({ error: e.code, message: e.message });
          return;
        }
        res.status(502).json({
          error: "upstream_error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }),
  );

  return app;
}
