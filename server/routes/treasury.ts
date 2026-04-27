import { Router } from "express";
import { db, generateId, logActivity } from "../db.js";

export const treasuryRouter = Router();

function toPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    destination: row.destination,
    policy: row.policy,
    status: row.status,
    allocationPercent: row.allocation_percent,
    notes: row.notes,
    createdByWallet: row.created_by_wallet ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMovedAt: row.last_moved_at,
  };
}

treasuryRouter.get("/", (req, res) => {
  try {
    const wallet =
      typeof req.query.wallet === "string" && req.query.wallet ? req.query.wallet : null;
    if (!wallet) return res.json([]);
    const rows = db
      .prepare("SELECT * FROM treasury_routes WHERE created_by_wallet = ? ORDER BY created_at DESC")
      .all(wallet);
    return res.json(rows.map(toPublic));
  } catch (err) {
    console.error("GET /api/treasury error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

treasuryRouter.get("/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM treasury_routes WHERE id = ?").get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Route not found" });
    return res.json(toPublic(row));
  } catch (err) {
    console.error("GET /api/treasury/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

treasuryRouter.post("/", (req, res) => {
  try {
    const body = req.body as Record<string, string | number>;
    if (!body.name?.toString().trim()) return res.status(400).json({ error: "name is required" });
    if (!body.source?.toString().trim())
      return res.status(400).json({ error: "source is required" });
    if (!body.destination?.toString().trim())
      return res.status(400).json({ error: "destination is required" });

    const id = generateId("TRS");
    const now = new Date().toISOString();
    const walletAddress = (body.walletAddress as string | undefined) ?? null;

    db.prepare(
      `
      INSERT INTO treasury_routes
        (id, name, source, destination, policy, status, allocation_percent, notes, created_by_wallet, created_at, updated_at, last_moved_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NULL)
    `,
    ).run(
      id,
      body.name.toString().trim(),
      body.source.toString().trim(),
      body.destination.toString().trim(),
      body.policy ?? "manual",
      body.allocationPercent ? parseFloat(body.allocationPercent.toString()) : 0,
      body.notes ?? "",
      walletAddress,
      now,
      now,
    );

    const row = db.prepare("SELECT * FROM treasury_routes WHERE id = ?").get(id) as Record<
      string,
      unknown
    >;

    logActivity({
      category: "treasury",
      event: "Treasury route created",
      detail: `${body.name} · ${body.source} → ${body.destination}`,
      operator: walletAddress
        ? `wallet:${walletAddress.slice(0, 8)}`
        : (body.createdBy?.toString() ?? "operator"),
      status: "info",
      relatedEntityType: "treasury_route",
      relatedEntityId: id,
      walletAddress,
    });

    return res.status(201).json(toPublic(row));
  } catch (err) {
    console.error("POST /api/treasury error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

treasuryRouter.patch("/:id", (req, res) => {
  try {
    const body = req.body as Record<string, string | number>;
    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE treasury_routes
      SET name = COALESCE(?, name),
          source = COALESCE(?, source),
          destination = COALESCE(?, destination),
          policy = COALESCE(?, policy),
          status = COALESCE(?, status),
          allocation_percent = COALESCE(?, allocation_percent),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `,
    ).run(
      body.name ?? null,
      body.source ?? null,
      body.destination ?? null,
      body.policy ?? null,
      body.status ?? null,
      body.allocationPercent ?? null,
      body.notes ?? null,
      now,
      req.params.id,
    );

    const row = db.prepare("SELECT * FROM treasury_routes WHERE id = ?").get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Route not found" });

    logActivity({
      category: "treasury",
      event: "Treasury route updated",
      detail: String(row.name),
      status: "info",
      relatedEntityType: "treasury_route",
      relatedEntityId: req.params.id,
      walletAddress: (row.created_by_wallet as string | null) ?? null,
    });

    return res.json(toPublic(row));
  } catch (err) {
    console.error("PATCH /api/treasury/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
