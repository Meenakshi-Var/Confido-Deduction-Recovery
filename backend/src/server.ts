import express from "express";
import cors from "cors";
import { deductionsRouter } from "./routes/deductions";
import { disputesRouter } from "./routes/disputes";
import { recoveryRouter } from "./routes/recovery";

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
