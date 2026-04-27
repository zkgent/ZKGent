import { Router } from "express";
import { db, logActivity } from "../db.js";

export const settingsRouter = Router();

function toPublic(row: Record<string, unknown>) {
  return {
    workspaceName: row.workspace_name,
    environment: row.environment,
    defaultPaymentRail: row.default_payment_rail,
    privacyMode: Boolean(row.privacy_mode),
    hideAmounts: Boolean(row.hide_amounts),
    shieldedAddress: Boolean(row.shielded_address),
    auditLog: Boolean(row.audit_log ?? 1),
    disclosurePolicy: row.disclosure_policy,
    complianceKeyFingerprint: row.compliance_key_fingerprint,
    notifyTransferSettled: Boolean(row.notifications_transfer_settled),
    notifyPayrollApproved: Boolean(row.notifications_payroll_approved),
    notifyCounterpartyKyc: Boolean(row.notifications_counterparty_kyc),
    notifySystemAlerts: Boolean(row.notifications_system_alerts),
    updatedAt: row.updated_at,
  };
}

settingsRouter.get("/", (_req, res) => {
  try {
    const row = db.prepare("SELECT * FROM workspace_settings WHERE id = 'singleton'").get() as
      | Record<string, unknown>
      | undefined;
    if (!row) return res.status(404).json({ error: "Settings not found" });
    return res.json(toPublic(row));
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

settingsRouter.put("/", (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const now = new Date().toISOString();

    const boolToInt = (v: unknown, current: unknown) => (v !== undefined ? (v ? 1 : 0) : current);

    const current = db
      .prepare("SELECT * FROM workspace_settings WHERE id = 'singleton'")
      .get() as Record<string, unknown>;

    db.prepare(
      `
      UPDATE workspace_settings SET
        workspace_name = ?,
        environment = ?,
        default_payment_rail = ?,
        privacy_mode = ?,
        hide_amounts = ?,
        shielded_address = ?,
        disclosure_policy = ?,
        compliance_key_fingerprint = ?,
        notifications_transfer_settled = ?,
        notifications_payroll_approved = ?,
        notifications_counterparty_kyc = ?,
        notifications_system_alerts = ?,
        updated_at = ?
      WHERE id = 'singleton'
    `,
    ).run(
      body.workspaceName ?? current.workspace_name,
      body.environment ?? current.environment,
      body.defaultPaymentRail ?? current.default_payment_rail,
      boolToInt(body.privacyMode, current.privacy_mode),
      boolToInt(body.hideAmounts, current.hide_amounts),
      boolToInt(body.shieldedAddress, current.shielded_address),
      body.disclosurePolicy ?? current.disclosure_policy,
      body.complianceKeyFingerprint ?? current.compliance_key_fingerprint,
      boolToInt(body.notifyTransferSettled, current.notifications_transfer_settled),
      boolToInt(body.notifyPayrollApproved, current.notifications_payroll_approved),
      boolToInt(body.notifyCounterpartyKyc, current.notifications_counterparty_kyc),
      boolToInt(body.notifySystemAlerts, current.notifications_system_alerts),
      now,
    );

    logActivity({
      category: "settings",
      event: "Settings updated",
      detail: "Workspace configuration changed",
      status: "info",
    });

    const updated = db
      .prepare("SELECT * FROM workspace_settings WHERE id = 'singleton'")
      .get() as Record<string, unknown>;
    return res.json(toPublic(updated));
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
