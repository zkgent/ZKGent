import { Router } from "express";
import { db, generateId, logActivity } from "../db.js";

export const payrollRouter = Router();

function toPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    scheduledDate: row.scheduled_date,
    recipientCount: row.recipient_count,
    asset: row.asset,
    status: row.status,
    approvalThreshold: row.approval_threshold,
    approvals: row.approvals,
    notes: row.notes,
    createdByWallet: row.created_by_wallet ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

payrollRouter.get("/", (req, res) => {
  try {
    const wallet = typeof req.query.wallet === "string" && req.query.wallet ? req.query.wallet : null;
    if (!wallet) return res.json([]);
    const rows = db.prepare("SELECT * FROM payroll_batches WHERE created_by_wallet = ? ORDER BY created_at DESC").all(wallet);
    return res.json(rows.map(toPublic));
  } catch (err) {
    console.error("GET /api/payroll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

payrollRouter.get("/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM payroll_batches WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: "Batch not found" });
    return res.json(toPublic(row));
  } catch (err) {
    console.error("GET /api/payroll/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

payrollRouter.post("/", (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    if (!body.name?.trim()) return res.status(400).json({ error: "name is required" });

    const id = generateId("PAY");
    const now = new Date().toISOString();
    const walletAddress = body.walletAddress ?? null;

    db.prepare(`
      INSERT INTO payroll_batches
        (id, name, scheduled_date, recipient_count, asset, status, approval_threshold, approvals, notes, created_by_wallet, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'draft', ?, 0, ?, ?, ?, ?)
    `).run(
      id,
      body.name.trim(),
      body.scheduledDate ?? null,
      body.recipientCount ? parseInt(body.recipientCount) : 0,
      body.asset ?? "USDC",
      body.approvalThreshold ? parseInt(body.approvalThreshold) : 2,
      body.notes ?? "",
      walletAddress,
      now,
      now
    );

    const row = db.prepare("SELECT * FROM payroll_batches WHERE id = ?").get(id) as Record<string, unknown>;

    logActivity({
      category: "payroll",
      event: "Payroll batch created",
      detail: `${body.name.trim()}${body.scheduledDate ? " · " + body.scheduledDate : ""}`,
      operator: walletAddress ? `wallet:${walletAddress.slice(0, 8)}` : (body.createdBy ?? "operator"),
      status: "info",
      relatedEntityType: "payroll_batch",
      relatedEntityId: id,
      walletAddress,
    });

    return res.status(201).json(toPublic(row));
  } catch (err) {
    console.error("POST /api/payroll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

payrollRouter.patch("/:id", (req, res) => {
  try {
    const body = req.body as Record<string, string | number>;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE payroll_batches
      SET name = COALESCE(?, name),
          scheduled_date = COALESCE(?, scheduled_date),
          recipient_count = COALESCE(?, recipient_count),
          asset = COALESCE(?, asset),
          status = COALESCE(?, status),
          approvals = COALESCE(?, approvals),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `).run(
      body.name ?? null,
      body.scheduledDate ?? null,
      body.recipientCount ?? null,
      body.asset ?? null,
      body.status ?? null,
      body.approvals ?? null,
      body.notes ?? null,
      now,
      req.params.id
    );

    const row = db.prepare("SELECT * FROM payroll_batches WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: "Batch not found" });

    if (body.status) {
      logActivity({
        category: "payroll",
        event: `Payroll batch ${body.status}`,
        detail: String(row.name),
        status: body.status === "settled" ? "ok" : "info",
        relatedEntityType: "payroll_batch",
        relatedEntityId: req.params.id,
        walletAddress: (row.created_by_wallet as string | null) ?? null,
      });
    }

    return res.json(toPublic(row));
  } catch (err) {
    console.error("PATCH /api/payroll/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
