import { Router } from "express";
import { db } from "../db.js";

export const activityRouter = Router();

function toPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    category: row.category,
    event: row.event,
    detail: row.detail,
    operator: row.operator,
    status: row.status,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    walletAddress: row.wallet_address ?? null,
    createdAt: row.created_at,
  };
}

activityRouter.get("/", (req, res) => {
  try {
    const { category, limit, wallet } = req.query as { category?: string; limit?: string; wallet?: string };
    const maxRows = Math.min(parseInt(limit ?? "100"), 200);

    if (!wallet) {
      // Per-wallet scoping enforced — no wallet means no events
      return res.json([]);
    }

    const rows = category && category !== "all"
      ? db.prepare("SELECT * FROM activity_events WHERE wallet_address = ? AND category = ? ORDER BY created_at DESC LIMIT ?").all(wallet, category, maxRows)
      : db.prepare("SELECT * FROM activity_events WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?").all(wallet, maxRows);

    return res.json(rows.map(toPublic));
  } catch (err) {
    console.error("GET /api/activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
