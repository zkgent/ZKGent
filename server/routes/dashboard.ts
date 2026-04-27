import { Router } from "express";
import { db } from "../db.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", (req, res) => {
  try {
    const wallet =
      typeof req.query.wallet === "string" && req.query.wallet ? req.query.wallet : null;

    const transferStats = wallet
      ? (db
          .prepare(
            `SELECT status, COUNT(*) as count FROM transfers WHERE initiated_by_wallet = ? GROUP BY status`,
          )
          .all(wallet) as { status: string; count: number }[])
      : ([] as { status: string; count: number }[]);

    const payrollStats = wallet
      ? (db
          .prepare(
            `SELECT status, COUNT(*) as count FROM payroll_batches WHERE created_by_wallet = ? GROUP BY status`,
          )
          .all(wallet) as { status: string; count: number }[])
      : [];

    const treasuryCount = wallet
      ? (
          db
            .prepare("SELECT COUNT(*) as count FROM treasury_routes WHERE created_by_wallet = ?")
            .get(wallet) as { count: number }
        ).count
      : 0;

    const cpStats = wallet
      ? (db
          .prepare(
            `SELECT status, COUNT(*) as count FROM counterparties WHERE created_by_wallet = ? GROUP BY status`,
          )
          .all(wallet) as { status: string; count: number }[])
      : [];

    const recentActivity = wallet
      ? (db
          .prepare(
            `SELECT * FROM activity_events WHERE wallet_address = ? ORDER BY created_at DESC LIMIT 10`,
          )
          .all(wallet) as Record<string, unknown>[])
      : [];

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
      walletScoped: !!wallet,
    });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
