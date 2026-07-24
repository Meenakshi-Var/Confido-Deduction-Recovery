import express from "express";
import cors from "cors";
import path from "path";
import { initDb } from "./db/client";
import { deductionsRouter } from "./routes/deductions";
import { disputesRouter } from "./routes/disputes";
import { recoveryRouter } from "./routes/recovery";

const DB_PATH = path.join(__dirname, "..", "app.db");

async function main() {
  await initDb(DB_PATH, false); // false: must already exist - run `npm run ingest` first

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", deductionsRouter);
  app.use("/api", disputesRouter);
  app.use("/api", recoveryRouter);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  app.listen(PORT, () => {
    console.log(`Deduction Recovery API listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
