/**
 * ZKGENT Identity API Routes
 *
 * Wallet-based identity model.
 * No web2 auth — wallet address is the identity.
 */

import { Router } from "express";
import {
  upsertWalletUser,
  getWalletUser,
  getWalletActivity,
  getAllWalletUsers,
} from "../domain/identity.js";
import { normalizeWalletAddress } from "../domain/wallet_auth.js";
import { rateLimit } from "../security.js";

export const identityRouter = Router();

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * POST /api/identity/resolve
 * Called when a wallet connects. Creates or updates the identity record.
 * Body: { wallet_address, wallet_name?, network_preference? }
 */
identityRouter.post(
  "/resolve",
  rateLimit({ scope: "identity-resolve", max: 60, windowMs: 60_000 }),
  (req, res) => {
    const { wallet_name, network_preference } = req.body;
    const wallet_address = normalizeWalletAddress(req.body?.wallet_address);
    if (!wallet_address) {
      return res.status(400).json({
        error: "wallet_address required (valid base58 Solana address)",
      });
    }

    try {
      const user = upsertWalletUser({
        wallet_address,
        wallet_name: wallet_name ?? undefined,
        network_preference: network_preference ?? undefined,
      });
      res.json({ identity: user });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  },
);

/**
 * GET /api/identity/:address
 * Fetch identity + activity for a wallet address.
 */
identityRouter.get("/:address", (req, res) => {
  const address = normalizeWalletAddress(req.params.address);
  if (!address) {
    return res.status(400).json({ error: "valid_wallet_address_required" });
  }

  try {
    const user = getWalletUser(address);
    if (!user) {
      return res
        .status(404)
        .json({ error: "identity_not_found", note: "Call POST /api/identity/resolve first." });
    }
    const activity = getWalletActivity(address);
    res.json({ identity: user, activity });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/**
 * GET /api/identity
 * List all known wallet identities. Admin use.
 */
identityRouter.get(
  "/",
  rateLimit({ scope: "identity-list", max: 20, windowMs: 60_000 }),
  (_req, res) => {
    try {
      const users = getAllWalletUsers(100);
      res.json({ count: users.length, users });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  },
);
