import { Router, Request, Response, NextFunction } from "express";
import { db, checkWalletAccess, ACCESS_GRANTING_STATUSES, type ApplicationRow } from "../db.js";
import { rateLimit } from "../security.js";

export const accessRouter = Router();

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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

function normalizeWalletAddress(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const wallet = input.trim();
  if (!wallet || !SOLANA_ADDRESS_RE.test(wallet)) return null;
  return wallet;
}

/**
 * GET /api/access/check?wallet=XXX
 * Returns whether a wallet has an approved early-access application.
 */
accessRouter.get(
  "/check",
  rateLimit({ scope: "access-check", max: 120, windowMs: 60_000 }),
  (req, res) => {
    const wallet = normalizeWalletAddress(req.query.wallet);
    if (!wallet) return res.status(400).json({ error: "valid wallet query param required" });

    const result = checkWalletAccess(wallet);
    return res.json({
      hasAccess: result.hasAccess,
      reason: result.hasAccess ? null : result.reason,
      application: publicView(result.application ?? null),
    });
  },
);

/**
 * POST /api/access/link-wallet
 * Link a wallet address to an existing application (one-way; no overwrite).
 * Body: { applicationId, walletAddress }
 *
 * Atomicity: wrapped in a transaction so the read-then-write window cannot be
 * split by a concurrent request, and the DB UNIQUE INDEX on wallet_address
 * provides a final integrity guarantee.
 */
accessRouter.post(
  "/link-wallet",
  rateLimit({ scope: "link-wallet", max: 20, windowMs: 60_000 }),
  (req, res) => {
    const { applicationId, walletAddress } = (req.body ?? {}) as {
      applicationId?: string;
      walletAddress?: string;
    };
    const normalizedWallet = normalizeWalletAddress(walletAddress);
    if (!applicationId || !normalizedWallet) {
      return res.status(400).json({ error: "applicationId and valid walletAddress required" });
    }

    type LinkResult =
      | { ok: true; row: ApplicationRow }
      | { ok: false; status: number; body: Record<string, unknown> };

    const linkTx = db.transaction((): LinkResult => {
      const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId) as
        | ApplicationRow
        | undefined;
      if (!row) return { ok: false, status: 404, body: { error: "application_not_found" } };

      if (row.wallet_address && row.wallet_address !== normalizedWallet) {
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
        .get(normalizedWallet, applicationId) as { id: string } | undefined;
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
          normalizedWallet,
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
      if (message.includes("UNIQUE")) {
        return res.status(409).json({
          error: "wallet_already_linked_to_another_application",
          hint: "This wallet is already linked to a different application.",
        });
      }
      return res.status(500).json({ error: "link_failed", detail: message });
    }

    if (!result.ok) return res.status(result.status).json(result.body);

    const access = checkWalletAccess(normalizedWallet);
    return res.json({
      application: publicView(result.row),
      hasAccess: access.hasAccess,
      reason: access.hasAccess ? null : (access.reason ?? null),
    });
  },
);

/**
 * Express middleware: require an approved-wallet header.
 *
 * Wallet identity in D1 is still unsigned, so this middleware enforces
 * consistency and input validation but is not a substitute for a signed
 * challenge flow. D2 should replace this with wallet-signed auth.
 */
export function requireApprovedWallet(req: WalletRequest, res: Response, next: NextFunction) {
  const headerWallet = normalizeWalletAddress(req.headers["x-wallet-address"]);
  const bodyWallet = normalizeWalletAddress(
    (req.body?.wallet_address as string | undefined) ||
      (req.body?.initiated_by_wallet as string | undefined),
  );

  const walletAddress = headerWallet ?? bodyWallet;

  if (!walletAddress) {
    return res.status(401).json({
      error: "wallet_required",
      hint: "This endpoint requires a connected Solana wallet. Pass a valid address via x-wallet-address header.",
    });
  }

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

  req.walletAddress = walletAddress;
  req.application = result.application;
  return next();
}

export const ACCESS_STATUSES = ACCESS_GRANTING_STATUSES;
