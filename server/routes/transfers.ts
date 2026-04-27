import { Router } from "express";
import { db, generateId, generateRef, logActivity } from "../db.js";

export const transfersRouter = Router();

function toPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    reference: row.reference,
    recipientAddress: row.recipient_address,
    amount: row.amount,
    asset: row.asset,
    status: row.status,
    proofState: row.proof_state,
    notes: row.notes,
    region: row.region,
    createdBy: row.created_by,
    initiatedByWallet: row.initiated_by_wallet ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settledAt: row.settled_at,
  };
}

transfersRouter.get("/", (req, res) => {
  try {
    const wallet =
      typeof req.query.wallet === "string" && req.query.wallet ? req.query.wallet : null;
    if (!wallet) return res.json([]);
    const rows = db
      .prepare("SELECT * FROM transfers WHERE initiated_by_wallet = ? ORDER BY created_at DESC")
      .all(wallet);
    return res.json(rows.map(toPublic));
  } catch (err) {
    console.error("GET /api/transfers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

transfersRouter.get("/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM transfers WHERE id = ?").get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Transfer not found" });
    return res.json(toPublic(row));
  } catch (err) {
    console.error("GET /api/transfers/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

transfersRouter.post("/", (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    if (!body.asset) return res.status(400).json({ error: "asset is required" });

    const id = generateId("TXF");
    const reference = generateRef("ZKG-T");
    const now = new Date().toISOString();
    const walletAddress = (body.walletAddress as string | undefined) ?? null;

    db.prepare(
      `
      INSERT INTO transfers
        (id, reference, recipient_address, amount, asset, status, proof_state, notes, region, created_by, initiated_by_wallet, created_at, updated_at, settled_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, NULL)
    `,
    ).run(
      id,
      reference,
      body.recipientAddress ?? "",
      body.amount ? parseFloat(body.amount) : null,
      body.asset,
      body.notes ?? "",
      body.region ?? "",
      walletAddress ? `wallet:${walletAddress.slice(0, 8)}` : (body.createdBy ?? "operator"),
      walletAddress,
      now,
      now,
    );

    const row = db.prepare("SELECT * FROM transfers WHERE id = ?").get(id) as Record<
      string,
      unknown
    >;

    logActivity({
      category: "transfer",
      event: "Transfer initiated",
      detail: `${reference} · ${body.asset}${body.region ? " · " + body.region : ""}`,
      operator: walletAddress
        ? `wallet:${walletAddress.slice(0, 8)}`
        : (body.createdBy ?? "operator"),
      status: "pending",
      relatedEntityType: "transfer",
      relatedEntityId: id,
      walletAddress,
    });

    return res.status(201).json(toPublic(row));
  } catch (err) {
    console.error("POST /api/transfers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

transfersRouter.patch("/:id/status", (req, res) => {
  try {
    const { status, proofState } = req.body as { status?: string; proofState?: string };
    const now = new Date().toISOString();
    const settled = status === "settled" ? now : null;

    db.prepare(
      `
      UPDATE transfers SET status = COALESCE(?, status), proof_state = COALESCE(?, proof_state),
      updated_at = ?, settled_at = COALESCE(?, settled_at) WHERE id = ?
    `,
    ).run(status ?? null, proofState ?? null, now, settled, req.params.id);

    const row = db.prepare("SELECT * FROM transfers WHERE id = ?").get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Transfer not found" });

    logActivity({
      category: "transfer",
      event: `Transfer ${status ?? "updated"}`,
      detail: String(row.reference),
      status: status === "settled" ? "ok" : status === "failed" ? "fail" : "info",
      relatedEntityType: "transfer",
      relatedEntityId: req.params.id,
    });

    return res.json(toPublic(row));
  } catch (err) {
    console.error("PATCH /api/transfers/:id/status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
