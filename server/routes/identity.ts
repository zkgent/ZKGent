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

export const identityRouter = Router();

/**
 * POST /api/identity/resolve
 * Called when a wallet connects. Creates or updates the identity record.
 * Body: { wallet_address, wallet_name?, network_preference? }
 */
identityRouter.post("/resolve", (req, res) => {
  const { wallet_address, wallet_name, network_preference } = req.body;
  if (!wallet_address || typeof wallet_address !== "string" || wallet_address.length < 32) {
    return res.status(400).json({ error: "wallet_address required (valid base58 Solana address)" });
  }

  try {
    const user = upsertWalletUser({
      wallet_address,
      wallet_name:        wallet_name        ?? undefined,
      network_preference: network_preference ?? undefined,
    });
    res.json({ identity: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/identity/:address
 * Fetch identity + activity for a wallet address.
 */
identityRouter.get("/:address", (req, res) => {
  const { address } = req.params;
  try {
    const user = getWalletUser(address);
    if (!user) {
      return res.status(404).json({ error: "identity_not_found", note: "Call POST /api/identity/resolve first." });
    }
    const activity = getWalletActivity(address);
    res.json({ identity: user, activity });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/identity
 * List all known wallet identities. Admin use.
 */
identityRouter.get("/", (_req, res) => {
  try {
    const users = getAllWalletUsers(100);
    res.json({ count: users.length, users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
