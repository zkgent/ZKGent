import { Router, Request, Response, NextFunction } from "express";
import { db, checkWalletAccess, ACCESS_GRANTING_STATUSES, type ApplicationRow } from "../db.js";

export const accessRouter = Router();

interface AccessResultLike {
  hasAccess: boolean;
  reason?: string | null;
  application?: ApplicationRow | null;
}

interface WalletRequest extends Request {
  walletAddress?: string;
  application?: ApplicationRow | null;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function publicView(app: ApplicationRow | null) {
  if (!app) return null;
  return {
    id: app.id,
    fullName: app.full_name,
    workEmail: app.work_email,
    company: app.company,
    status: app.status,
    walletAddress: app.wallet_address,
    approvedAt: app.approved_at,
    createdAt: app.created_at,
  };
}

/**
 * GET /api/access/check?wallet=XXX
 * Returns whether a wallet has an approved early-access application.
 */
accessRouter.get("/check", (req, res) => {
  const wallet = (req.query.wallet as string)?.trim();
  if (!wallet) return res.status(400).json({ error: "wallet query param required" });

  const result = checkWalletAccess(wallet);
  return res.json({
    hasAccess: result.hasAccess,
    reason: result.hasAccess ? null : result.reason,
    application: publicView(result.hasAccess ? result.application : result.application),
  });
});

/**
 * POST /api/access/link-wallet
 * Link a wallet address to an existing application (one-way; no overwrite).
 * Body: { applicationId, walletAddress }
 *
 * Atomicity: wrapped in a transaction so the read-then-write window cannot be
 * split by a concurrent request, and the DB UNIQUE INDEX on wallet_address
 * provides a final integrity guarantee.
 */
accessRouter.post("/link-wallet", (req, res) => {
  const { applicationId, walletAddress } = (req.body ?? {}) as {
    applicationId?: string;
    walletAddress?: string;
  };
  if (!applicationId || !walletAddress) {
    return res.status(400).json({ error: "applicationId and walletAddress required" });
  }

  type LinkResult =
    | { ok: true; row: ApplicationRow }
    | { ok: false; status: number; body: Record<string, unknown> };

  const linkTx = db.transaction((): LinkResult => {
    const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId) as
      | ApplicationRow
      | undefined;
    if (!row) return { ok: false, status: 404, body: { error: "application_not_found" } };

    if (row.wallet_address && row.wallet_address !== walletAddress) {
      return {
        ok: false,
        status: 409,
        body: {
          error: "application_already_linked_to_another_wallet",
          hint: "Contact support if you need to change the wallet on file.",
        },
      };
    }

    const collision = db
      .prepare("SELECT id FROM applications WHERE wallet_address = ? AND id != ?")
      .get(walletAddress, applicationId) as { id: string } | undefined;
    if (collision) {
      return {
        ok: false,
        status: 409,
        body: {
          error: "wallet_already_linked_to_another_application",
          otherApplicationId: collision.id,
        },
      };
    }

    if (!row.wallet_address) {
      db.prepare("UPDATE applications SET wallet_address = ?, updated_at = ? WHERE id = ?").run(
        walletAddress,
        new Date().toISOString(),
        applicationId,
      );
    }

    const updated = db
      .prepare("SELECT * FROM applications WHERE id = ?")
      .get(applicationId) as ApplicationRow;
    return { ok: true, row: updated };
  });

  let result: LinkResult;
  try {
    result = linkTx();
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    // UNIQUE constraint trip — most likely concurrent linkage.
    if (message.includes("UNIQUE")) {
      return res.status(409).json({
        error: "wallet_already_linked_to_another_application",
        hint: "This wallet is already linked to a different application.",
      });
    }
    return res.status(500).json({ error: "link_failed", detail: message });
  }

  if (!result.ok) return res.status(result.status).json(result.body);

  const access = checkWalletAccess(walletAddress);
  return res.json({
    application: publicView(result.row),
    hasAccess: access.hasAccess,
    reason: access.hasAccess ? null : (access.reason ?? null),
  });
});

/**
 * Express middleware: require an approved-wallet header.
 *
 * Wallet identity is read from `x-wallet-address` header OR the request body
 * (`wallet_address` / `initiated_by_wallet`). If both are present they MUST
 * agree — this prevents the case where a caller passes one approved wallet
 * in the header and a different (non-approved) wallet in the body that the
 * downstream handler then operates on.
 *
 * Downstream handlers should ALWAYS prefer `(req as any).walletAddress` set
 * here over re-reading wallet fields from the body.
 *
 * KNOWN LIMITATION (D1 trust model): wallet identity is unsigned and could be
 * spoofed by a determined attacker. This gating is a soft cohort control for
 * devnet alpha, not a cryptographic auth boundary. Wallet signature challenge
 * is planned for D2 alongside client-side proving.
 */
export function requireApprovedWallet(req: WalletRequest, res: Response, next: NextFunction) {
  const headerWallet = (req.headers["x-wallet-address"] as string | undefined)?.trim() || undefined;
  const bodyWallet =
    (
      (req.body?.wallet_address as string | undefined) ||
      (req.body?.initiated_by_wallet as string | undefined)
    )?.trim() || undefined;

  const walletAddress = headerWallet ?? bodyWallet;

  if (!walletAddress) {
    return res.status(401).json({
      error: "wallet_required",
      hint: "This endpoint requires a connected Solana wallet. Pass it via x-wallet-address header.",
    });
  }

  // If both header and body specify a wallet, they must match. Otherwise reject —
  // this closes the bypass where one wallet is gated and a different one is acted on.
  if (headerWallet && bodyWallet && headerWallet !== bodyWallet) {
    return res.status(400).json({
      error: "wallet_mismatch",
      hint: "Header wallet does not match request body wallet. Refusing to act on a different wallet than the one being authorized.",
    });
  }

  const result = checkWalletAccess(walletAddress);
  if (!result.hasAccess) {
    return res.status(403).json({
      error: "access_denied",
      reason: result.reason,
      hint:
        result.reason === "no_application"
          ? "Apply for early access at /apply, then link this wallet."
          : result.reason === "pending_review"
            ? "Your application is still under review. You will be notified when approved."
            : "Your application was not approved for early access.",
      applicationId: result.application?.id ?? null,
    });
  }

  // Attach for downstream handlers — they MUST use these instead of re-reading body.
  req.walletAddress = walletAddress;
  req.application = result.application;
  return next();
}

export const ACCESS_STATUSES = ACCESS_GRANTING_STATUSES;
