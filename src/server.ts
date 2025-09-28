// src\server.ts
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening at ${env.DOMAIN}`);
});
}
main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
