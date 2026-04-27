import { Router, type Request } from "express";
import { rateLimit } from "../security.js";
import {
  createWalletChallenge,
  getWalletSession,
  normalizeWalletAddress,
  revokeWalletSession,
  verifyWalletChallenge,
} from "../domain/wallet_auth.js";

export const walletAuthRouter = Router();

function readSessionToken(req: Request) {
  const header = req.headers["x-wallet-session"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

walletAuthRouter.post(
  "/challenge",
  rateLimit({ scope: "wallet-auth-challenge", max: 20, windowMs: 60_000 }),
  (req, res) => {
    const walletAddress = normalizeWalletAddress(req.body?.wallet_address);
    if (!walletAddress) {
      return res.status(400).json({ error: "valid_wallet_address_required" });
    }

    try {
      const challenge = createWalletChallenge(walletAddress);
      return res.json(challenge);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message === "too_many_active_challenges" ? 429 : 400;
      return res.status(status).json({ error: message });
    }
  },
);

walletAuthRouter.post(
  "/verify",
  rateLimit({ scope: "wallet-auth-verify", max: 20, windowMs: 60_000 }),
  async (req, res) => {
    const walletAddress = normalizeWalletAddress(req.body?.wallet_address);
    const challengeId = typeof req.body?.challenge_id === "string" ? req.body.challenge_id : null;
    const signatureBase58 =
      typeof req.body?.signature_base58 === "string" ? req.body.signature_base58 : null;

    if (!walletAddress || !challengeId || !signatureBase58) {
      return res.status(400).json({
        error: "wallet_address_challenge_id_and_signature_base58_required",
      });
    }

    try {
      const result = await verifyWalletChallenge({ walletAddress, challengeId, signatureBase58 });
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        message === "challenge_not_found_or_expired" || message === "invalid_signature" ? 401 : 400;
      return res.status(status).json({ error: message });
    }
  },
);

walletAuthRouter.get("/session", (req, res) => {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: "wallet_session_required" });

  const session = getWalletSession(token);
  if (!session) return res.status(401).json({ error: "wallet_session_invalid" });

  return res.json({
    session: {
      id: session.id,
      wallet_address: session.wallet_address,
      created_at: session.created_at,
      expires_at: session.expires_at,
      last_seen_at: session.last_seen_at,
    },
  });
});

walletAuthRouter.post("/logout", (req, res) => {
  const token = readSessionToken(req);
  if (token) revokeWalletSession(token);
  return res.json({ ok: true });
});
