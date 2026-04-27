import { Router } from "express";
import { db, generateId, logActivity } from "../db.js";

export const counterpartiesRouter = Router();

function toPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.region,
    relationship: row.relationship,
    status: row.status,
    contactEmail: row.contact_email,
    walletAddress: row.wallet_address,
    notes: row.notes,
    createdByWallet: row.created_by_wallet ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at,
  };
}

counterpartiesRouter.get("/", (req, res) => {
  try {
    const { status, wallet } = req.query as { status?: string; wallet?: string };
    if (!wallet) return res.json([]);

    const rows =
      status && status !== "all"
        ? db
            .prepare(
              "SELECT * FROM counterparties WHERE created_by_wallet = ? AND status = ? ORDER BY created_at DESC",
            )
            .all(wallet, status)
        : db
            .prepare(
              "SELECT * FROM counterparties WHERE created_by_wallet = ? ORDER BY created_at DESC",
            )
            .all(wallet);
    return res.json(rows.map(toPublic));
  } catch (err) {
    console.error("GET /api/counterparties error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

counterpartiesRouter.get("/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM counterparties WHERE id = ?").get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Counterparty not found" });
    return res.json(toPublic(row));
  } catch (err) {
    console.error("GET /api/counterparties/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

counterpartiesRouter.post("/", (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    if (!body.name?.trim()) return res.status(400).json({ error: "name is required" });

    const id = generateId("CPT");
    const now = new Date().toISOString();
    const createdByWallet = body.createdByWallet ?? null;

    db.prepare(
      `
      INSERT INTO counterparties
        (id, name, type, region, relationship, status, contact_email, wallet_address, notes, created_by_wallet, created_at, updated_at, last_activity_at)
      VALUES (?, ?, ?, ?, ?, 'not_connected', ?, ?, ?, ?, ?, ?, NULL)
    `,
    ).run(
      id,
      body.name.trim(),
      body.type ?? "Institutional",
      body.region ?? "",
      body.relationship ?? "Vendor",
      body.contactEmail ?? "",
      body.walletAddress ?? "",
      body.notes ?? "",
      createdByWallet,
      now,
      now,
    );

    const row = db.prepare("SELECT * FROM counterparties WHERE id = ?").get(id) as Record<
      string,
      unknown
    >;

    logActivity({
      category: "counterparty",
      event: "Counterparty added",
      detail: `${body.name.trim()}${body.region ? " · " + body.region : ""}`,
      operator: createdByWallet
        ? `wallet:${createdByWallet.slice(0, 8)}`
        : (body.createdBy ?? "operator"),
      status: "info",
      relatedEntityType: "counterparty",
      relatedEntityId: id,
      walletAddress: createdByWallet,
    });

    return res.status(201).json(toPublic(row));
  } catch (err) {
    console.error("POST /api/counterparties error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

counterpartiesRouter.patch("/:id", (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE counterparties
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          region = COALESCE(?, region),
          relationship = COALESCE(?, relationship),
          status = COALESCE(?, status),
          contact_email = COALESCE(?, contact_email),
          wallet_address = COALESCE(?, wallet_address),
          notes = COALESCE(?, notes),
          updated_at = ?,
          last_activity_at = ?
      WHERE id = ?
    `,
    ).run(
      body.name ?? null,
      body.type ?? null,
      body.region ?? null,
      body.relationship ?? null,
      body.status ?? null,
      body.contactEmail ?? null,
      body.walletAddress ?? null,
      body.notes ?? null,
      now,
      now,
      req.params.id,
    );

    const row = db.prepare("SELECT * FROM counterparties WHERE id = ?").get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Counterparty not found" });

    logActivity({
      category: "counterparty",
      event: "Counterparty updated",
      detail: `${row.name}${body.status ? " · Status: " + body.status : ""}`,
      status: "info",
      relatedEntityType: "counterparty",
      relatedEntityId: req.params.id,
      walletAddress: (row.created_by_wallet as string | null) ?? null,
    });

    return res.json(toPublic(row));
  } catch (err) {
    console.error("PATCH /api/counterparties/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
