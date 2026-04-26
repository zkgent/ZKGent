import express from "express";
import cors from "cors";
import { applicationsRouter } from "./routes/applications.js";
import { adminRouter } from "./routes/admin.js";
import { transfersRouter } from "./routes/transfers.js";
import { payrollRouter } from "./routes/payroll.js";
import { treasuryRouter } from "./routes/treasury.js";
import { counterpartiesRouter } from "./routes/counterparties.js";
import { activityRouter } from "./routes/activity.js";
import { settingsRouter } from "./routes/settings.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();
const PORT = parseInt(process.env.API_PORT || "3001", 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/applications", applicationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/treasury", treasuryRouter);
app.use("/api/counterparties", counterpartiesRouter);
app.use("/api/activity", activityRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OBSIDIAN API running on port ${PORT}`);
});
