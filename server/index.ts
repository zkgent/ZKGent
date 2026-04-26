import express from "express";
import cors from "cors";
import { applicationsRouter } from "./routes/applications.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
const PORT = parseInt(process.env.API_PORT || "3001", 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/applications", applicationsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OBSIDIAN API running on port ${PORT}`);
});
