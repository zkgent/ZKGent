import { Router } from "express";
import { db } from "../db.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", (_req, res) => {
  try {
    const transferStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM transfers GROUP BY status
    `).all() as { status: string; count: number }[];

    const payrollStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM payroll_batches GROUP BY status
    `).all() as { status: string; count: number }[];

    const treasuryCount = (db.prepare("SELECT COUNT(*) as count FROM treasury_routes").get() as { count: number }).count;

    const cpStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM counterparties GROUP BY status
    `).all() as { status: string; count: number }[];

    const recentActivity = db.prepare(`
      SELECT * FROM activity_events ORDER BY created_at DESC LIMIT 10
    `).all() as Record<string, unknown>[];

    const toMap = (arr: { status: string; count: number }[]) =>
      Object.fromEntries(arr.map((r) => [r.status, r.count]));

    const tMap = toMap(transferStats);
    const pMap = toMap(payrollStats);
    const cMap = toMap(cpStats);

    return res.json({
      transfers: {
        pending: tMap.pending ?? 0,
        verified: tMap.verified ?? 0,
        settled: tMap.settled ?? 0,
        failed: tMap.failed ?? 0,
        total: Object.values(tMap).reduce((a, b) => a + b, 0),
      },
      payroll: {
        draft: pMap.draft ?? 0,
        pending: pMap.pending ?? 0,
        settled: pMap.settled ?? 0,
        total: Object.values(pMap).reduce((a, b) => a + b, 0),
      },
      treasury: {
        total: treasuryCount,
      },
      counterparties: {
        verified: cMap.verified ?? 0,
        pending_kyc: cMap.pending_kyc ?? 0,
        not_connected: cMap.not_connected ?? 0,
        total: Object.values(cMap).reduce((a, b) => a + b, 0),
      },
      recentActivity: recentActivity.map((r) => ({
        id: r.id,
        category: r.category,
        event: r.event,
        detail: r.detail,
        operator: r.operator,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
