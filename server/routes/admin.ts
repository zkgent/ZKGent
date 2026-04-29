import { Router, Request, Response, NextFunction } from "express";
import {
  db,
  VALID_STATUSES,
  VALID_PRIORITIES,
  ACCESS_GRANTING_STATUSES,
  type ApplicationRow,
} from "../db.js";
import { getRequiredAdminKey, rateLimit, timingSafeEqualText } from "../security.js";

export const adminRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configuredAdminKey = getRequiredAdminKey();
  if (!configuredAdminKey) {
    return res.status(503).json({
      error: "admin_unconfigured",
      hint: "Set ADMIN_KEY in the environment before using admin routes.",
    });
  }

  const key =
    (typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"] : undefined) ||
    (typeof req.query.key === "string" ? req.query.key : undefined);

  if (!key || !timingSafeEqualText(key, configuredAdminKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

adminRouter.use(rateLimit({ scope: "admin", max: 30, windowMs: 60_000 }));
adminRouter.use(requireAdmin);

function isValidStatus(value: string): value is (typeof VALID_STATUSES)[number] {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

function isValidPriority(value: string): value is (typeof VALID_PRIORITIES)[number] {
  return (VALID_PRIORITIES as readonly string[]).includes(value);
}

function toAdmin(row: ApplicationRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    workEmail: row.work_email,
    company: row.company,
    role: row.role,
    useCase: row.use_case,
    teamSize: row.team_size,
    region: row.region,
    monthlyVolume: row.monthly_volume,
    currentRail: row.current_rail,
    privacyConcern: row.privacy_concern,
    whyConfidential: row.why_confidential,
    status: row.status,
    internalNotes: row.internal_notes,
    reviewPriority: row.review_priority,
    tags: row.tags,
    contactedAt: row.contacted_at,
    walletAddress: row.wallet_address,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

adminRouter.get("/applications", (req, res) => {
  try {
    const { status, search, priority } = req.query as Record<string, string>;

    let query = "SELECT * FROM applications WHERE 1=1";
    const params: string[] = [];

    if (status && isValidStatus(status)) {
      query += " AND status = ?";
      params.push(status);
    }

    if (priority && isValidPriority(priority)) {
      query += " AND review_priority = ?";
      params.push(priority);
    }

    if (search?.trim()) {
      const like = `%${search.trim().toLowerCase()}%`;
      query +=
        " AND (lower(full_name) LIKE ? OR lower(work_email) LIKE ? OR lower(company) LIKE ?)";
      params.push(like, like, like);
    }

    query += " ORDER BY created_at DESC";

    const rows = db.prepare(query).all(...params) as ApplicationRow[];
    const total = (
      db.prepare("SELECT COUNT(*) as count FROM applications").get() as { count: number }
    ).count;
    const byStatus = db
      .prepare("SELECT status, COUNT(*) as count FROM applications GROUP BY status")
      .all() as { status: string; count: number }[];

    return res.json({
      applications: rows.map(toAdmin),
      meta: { total, byStatus },
    });
  } catch (err) {
    console.error("GET /api/admin/applications error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.get("/applications/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id) as
      | ApplicationRow
      | undefined;
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(toAdmin(row));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.patch("/applications/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id) as
      | ApplicationRow
      | undefined;
    if (!row) return res.status(404).json({ error: "Not found" });

    const body = req.body as Record<string, string>;
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.push("status = ?");
      params.push(body.status);

      if (body.status === "contacted" && !row.contacted_at) {
        updates.push("contacted_at = ?");
        params.push(new Date().toISOString());
      }

      // Stamp approved_at the first time the application crosses into an
      // access-granting status. Lets us later show "approved on …" in the UI.
      if (
        (ACCESS_GRANTING_STATUSES as readonly string[]).includes(body.status) &&
        !row.approved_at
      ) {
        updates.push("approved_at = ?");
        params.push(new Date().toISOString());
      }
    }

    if (body.internalNotes !== undefined) {
      updates.push("internal_notes = ?");
      params.push(body.internalNotes);
    }

    if (body.reviewPriority !== undefined) {
      if (!isValidPriority(body.reviewPriority)) {
        return res.status(400).json({ error: "Invalid priority" });
      }
      updates.push("review_priority = ?");
      params.push(body.reviewPriority);
    }

    if (body.tags !== undefined) {
      updates.push("tags = ?");
      params.push(body.tags);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    updates.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(req.params.id);

    db.prepare(`UPDATE applications SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    const updated = db
      .prepare("SELECT * FROM applications WHERE id = ?")
      .get(req.params.id) as ApplicationRow;
    return res.json(toAdmin(updated));
  } catch (err) {
    console.error("PATCH /api/admin/applications/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.delete("/applications/:id", (req, res) => {
  try {
    const info = db.prepare("DELETE FROM applications WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});
