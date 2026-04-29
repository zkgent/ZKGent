/**
 * ZKGENT Wallet Context
 *
 * Solana wallet integration using window.solana (Phantom/Backpack/Solflare).
 *
 * Signing capabilities:
 *   - signMessage()          — debug/authorization signature
 *   - authenticate()        — signed challenge session bootstrap
 *   - signAndSubmitTx()     — real signTransaction + sendRawTransaction flow
 *
 * Identity:
 *   - On connect, resolves/creates wallet identity via POST /api/identity/resolve
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import bs58 from "bs58";

interface WalletProviderLike {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toBase58?: () => string; toString?: () => string } | null;
  connect: () => Promise<{
    publicKey?: { toBase58?: () => string; toString?: () => string } | null;
  }>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
  signTransaction?: <T>(tx: T) => Promise<T>;
}

interface WalletWindow extends Window {
  phantom?: { solana?: WalletProviderLike };
  backpack?: WalletProviderLike;
  solflare?: WalletProviderLike;
  solana?: WalletProviderLike;
}

interface ApiErrorPayload {
  error?: string;
}

export type WalletStatus =
  | "not_installed"
  | "disconnected"
  | "connecting"
  | "connected"
  | "signing"
  | "error";

export interface WalletIdentity {
  id: string;
  wallet_address: string;
  identity_fingerprint: string;
  wallet_name: string | null;
  network_preference: string;
  first_seen_at: string;
  last_seen_at: string;
  session_count: number;
}

export interface WalletInfo {
  address: string;
  shortAddress: string;
  walletName: string;
}

export interface TxSignResult {
  tx_signature: string;
  explorer_url: string;
  status: string;
}

export interface WalletContextValue {
  status: WalletStatus;
  wallet: WalletInfo | null;
  identity: WalletIdentity | null;
  error: string | null;
  isInstalled: boolean;
  walletSessionToken: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<{ signature: string; publicKey: string } | null>;
  authenticate: () => Promise<boolean>;
  signAndSubmitTx: (settlementId: string) => Promise<TxSignResult | null>;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);
const WALLET_SESSION_STORAGE_KEY = "zkgent_wallet_session";

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

function detectWallet(): { provider: WalletProviderLike; name: string } | null {
  const win = window as WalletWindow;
  if (win.phantom?.solana?.isPhantom) return { provider: win.phantom.solana, name: "Phantom" };
  if (win.backpack?.isBackpack) return { provider: win.backpack, name: "Backpack" };
  if (win.solflare?.isSolflare) return { provider: win.solflare, name: "Solflare" };
  if (win.solana) return { provider: win.solana, name: "Solana Wallet" };
  return null;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

async function resolveIdentity(
  walletAddress: string,
  walletName: string,
): Promise<WalletIdentity | null> {
  try {
    const res = await fetch("/api/identity/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: walletAddress, wallet_name: walletName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.identity ?? null;
  } catch {
    return null;
  }
}

function readStoredWalletSession(): string | null {
  try {
    return localStorage.getItem(WALLET_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearStoredWalletSession() {
  try {
    localStorage.removeItem(WALLET_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function writeStoredWalletSession(token: string) {
  try {
    localStorage.setItem(WALLET_SESSION_STORAGE_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [walletSessionToken, setWalletSessionToken] = useState<string | null>(() =>
    readStoredWalletSession(),
  );

  useEffect(() => {
    const check = () => setIsInstalled(!!detectWallet());
    check();
    const t = setTimeout(check, 1000);
    return () => clearTimeout(t);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const detected = detectWallet();
    if (!detected) {
      setStatus("not_installed");
      setError("No Solana wallet found. Install Phantom or Backpack.");
      return;
    }
    setStatus("connecting");
    try {
      const res = await detected.provider.connect();
      const address = (res.publicKey?.toBase58?.() ??
        res.publicKey?.toString?.() ??
        String(res.publicKey)) as string;
      const info: WalletInfo = {
        address,
        shortAddress: shortAddr(address),
        walletName: detected.name,
      };
      setWallet(info);
      setStatus("connected");
      setWalletSessionToken(null);
      clearStoredWalletSession();
      resolveIdentity(address, detected.name).then((id) => setIdentity(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection rejected");
      setStatus("disconnected");
    }
  }, []);

  const disconnect = useCallback(async () => {
    const detected = detectWallet();
    if (walletSessionToken) {
      try {
        await fetch("/api/wallet-auth/logout", {
          method: "POST",
          headers: { "x-wallet-session": walletSessionToken },
        });
      } catch {
        // ignore logout network errors
      }
    }
    if (detected?.provider?.disconnect) {
      try {
        await detected.provider.disconnect();
      } catch {
        // ignore wallet disconnect errors
      }
    }
    setWallet(null);
    setIdentity(null);
    setWalletSessionToken(null);
    clearStoredWalletSession();
    setStatus("disconnected");
    setError(null);
  }, [walletSessionToken]);

  const signMessage = useCallback(
    async (message: string): Promise<{ signature: string; publicKey: string } | null> => {
      const detected = detectWallet();
      if (!detected || !wallet) return null;
      setStatus("signing");
      try {
        const encoded = new TextEncoder().encode(message);
        const res = await detected.provider.signMessage?.(encoded, "utf8");
        if (!res) throw new Error("Wallet does not support signMessage");
        const sig = Buffer.from(res.signature).toString("hex");
        setStatus("connected");
        return { signature: sig, publicKey: wallet.address };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Sign rejected");
        setStatus("connected");
        return null;
      }
    },
    [wallet],
  );

  const authenticate = useCallback(async (): Promise<boolean> => {
    const detected = detectWallet();
    if (!detected || !wallet || !detected.provider.signMessage) {
      setError("Wallet signing is not available");
      return false;
    }

    setStatus("signing");
    try {
      const challengeRes = await fetch("/api/wallet-auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet.address }),
      });
      if (!challengeRes.ok) {
        const err = (await challengeRes.json()) as ApiErrorPayload;
        throw new Error(err.error ?? "challenge_failed");
      }

      const challenge = await challengeRes.json();
      const encoded = new TextEncoder().encode(String(challenge.message ?? ""));
      const signed = await detected.provider.signMessage(encoded, "utf8");
      const signatureBase58 = bs58.encode(signed.signature);

      const verifyRes = await fetch("/api/wallet-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: wallet.address,
          challenge_id: challenge.id,
          signature_base58: signatureBase58,
        }),
      });
      if (!verifyRes.ok) {
        const err = (await verifyRes.json()) as ApiErrorPayload;
        throw new Error(err.error ?? "wallet_auth_failed");
      }

      const data = await verifyRes.json();
      const token = data.session?.token as string | undefined;
      if (!token) throw new Error("wallet_session_missing");
      setWalletSessionToken(token);
      writeStoredWalletSession(token);
      setStatus("connected");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Wallet authentication failed");
      setStatus("connected");
      return false;
    }
  }, [wallet]);

  /**
   * Real signTransaction flow:
   * 1. Ask backend to prepare a real serialized Solana Transaction
   * 2. Deserialize with @solana/web3.js Transaction.from()
   * 3. Pass to wallet.signTransaction()
   * 4. Submit signed tx to Solana via connection.sendRawTransaction()
   * 5. Report tx signature back to backend via POST /api/zk/tx/confirm
   */
  const signAndSubmitTx = useCallback(
    async (settlementId: string): Promise<TxSignResult | null> => {
      const detected = detectWallet();
      if (!detected || !wallet) {
        setError("Wallet not connected");
        return null;
      }
      setStatus("signing");
      try {
        let sessionToken = walletSessionToken;
        if (!sessionToken) {
          const ok = await authenticate();
          if (!ok) throw new Error("wallet_auth_required");
          sessionToken = readStoredWalletSession();
        }

        const prepRes = await fetch("/api/zk/tx/prepare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wallet-address": wallet.address,
            ...(sessionToken ? { "x-wallet-session": sessionToken } : {}),
          },
          body: JSON.stringify({ settlement_id: settlementId, wallet_address: wallet.address }),
        });
        if (!prepRes.ok) {
          const err = (await prepRes.json()) as ApiErrorPayload;
          throw new Error(err.error ?? "tx preparation failed");
        }
        const { request_id, serialized_tx, network } = await prepRes.json();

        const { Transaction, Connection } = await import("@solana/web3.js");
        const txBytes = Buffer.from(serialized_tx, "base64");
        const tx = Transaction.from(txBytes);

        const signedTx = await detected.provider.signTransaction?.(tx);
        if (!signedTx) throw new Error("Wallet does not support signTransaction");

        const cluster = network === "mainnet-beta" ? "mainnet-beta" : network;
        const rpcUrl =
          cluster === "mainnet-beta"
            ? "https://api.mainnet-beta.solana.com"
            : `https://api.${cluster}.solana.com`;
        const connection = new Connection(rpcUrl, "confirmed");
        const rawTx = signedTx.serialize();
        const txSignature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          maxRetries: 3,
        });

        const confirmRes = await fetch("/api/zk/tx/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wallet-address": wallet.address,
            ...(sessionToken ? { "x-wallet-session": sessionToken } : {}),
          },
          body: JSON.stringify({
            request_id,
            tx_signature: txSignature,
            network,
          }),
        });
        if (!confirmRes.ok) {
          const err = (await confirmRes.json()) as ApiErrorPayload;
          throw new Error(err.error ?? "tx_confirm_failed");
        }
        const confirmData = await confirmRes.json();

        setStatus("connected");
        return {
          tx_signature: txSignature,
          explorer_url: confirmData.explorer_url ?? "",
          status: confirmData.status ?? "submitted_on_chain",
        };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Transaction failed");
        setStatus("connected");
        return null;
      }
    },
    [authenticate, wallet, walletSessionToken],
  );

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const detected = detectWallet();
    if (!detected?.provider?.publicKey) return;
    const address = detected.provider.publicKey.toBase58?.() ?? wallet.address;
    setWallet((prev) => (prev ? { ...prev, address, shortAddress: shortAddr(address) } : null));
    const id = await resolveIdentity(address, wallet.walletName);
    if (id) setIdentity(id);
  }, [wallet]);

  return (
    <WalletContext.Provider
      value={{
        status,
        wallet,
        identity,
        error,
        isInstalled,
        walletSessionToken,
        connect,
        disconnect,
        signMessage,
        authenticate,
        signAndSubmitTx,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
