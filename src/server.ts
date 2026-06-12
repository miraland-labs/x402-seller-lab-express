import { createApp } from "../src/app.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`x402-seller-lab-express listening on http://localhost:${port}`);
  console.log(`Try unpaid: curl -i "http://localhost:${port}/api/v1/weather?city=Atlanta"`);
});
