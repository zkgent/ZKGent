/**
 * ZKGENT Wallet Context
 *
 * Solana wallet integration using window.solana (Phantom/Backpack/Solflare).
 *
 * Signing capabilities:
 *   - signMessage()          — debug/authorization signature
 *   - signAndSubmitTx()      — real signTransaction + sendRawTransaction flow
 *
 * Identity:
 *   - On connect, resolves/creates wallet identity via POST /api/identity/resolve
 */

import {
  createContext, useContext, useState, useCallback, useEffect, ReactNode,
} from "react";

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
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<{ signature: string; publicKey: string } | null>;
  signAndSubmitTx: (settlementId: string) => Promise<TxSignResult | null>;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

function detectWallet(): { provider: any; name: string } | null {
  const win = window as any;
  if (win.phantom?.solana?.isPhantom) return { provider: win.phantom.solana, name: "Phantom" };
  if (win.backpack?.isBackpack)        return { provider: win.backpack, name: "Backpack" };
  if (win.solflare?.isSolflare)       return { provider: win.solflare, name: "Solflare" };
  if (win.solana)                     return { provider: win.solana, name: "Solana Wallet" };
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
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ wallet_address: walletAddress, wallet_name: walletName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.identity ?? null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status,      setStatus]      = useState<WalletStatus>("disconnected");
  const [wallet,      setWallet]      = useState<WalletInfo | null>(null);
  const [identity,    setIdentity]    = useState<WalletIdentity | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

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
      const address = (res.publicKey?.toBase58?.() ?? res.publicKey?.toString?.() ?? String(res.publicKey)) as string;
      const info: WalletInfo = { address, shortAddress: shortAddr(address), walletName: detected.name };
      setWallet(info);
      setStatus("connected");
      // Resolve/create wallet identity
      resolveIdentity(address, detected.name).then(id => setIdentity(id));
    } catch (err: any) {
      setError(err.message ?? "Connection rejected");
      setStatus("disconnected");
    }
  }, []);

  const disconnect = useCallback(async () => {
    const detected = detectWallet();
    if (detected?.provider?.disconnect) {
      try { await detected.provider.disconnect(); } catch {}
    }
    setWallet(null);
    setIdentity(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  const signMessage = useCallback(async (
    message: string,
  ): Promise<{ signature: string; publicKey: string } | null> => {
    const detected = detectWallet();
    if (!detected || !wallet) return null;
    setStatus("signing");
    try {
      const encoded = new TextEncoder().encode(message);
      const res = await detected.provider.signMessage(encoded, "utf8");
      const sig = Buffer.from(res.signature).toString("hex");
      setStatus("connected");
      return { signature: sig, publicKey: wallet.address };
    } catch (err: any) {
      setError(err.message ?? "Sign rejected");
      setStatus("connected");
      return null;
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
  const signAndSubmitTx = useCallback(async (
    settlementId: string,
  ): Promise<TxSignResult | null> => {
    const detected = detectWallet();
    if (!detected || !wallet) {
      setError("Wallet not connected");
      return null;
    }
    setStatus("signing");
    try {
      // Step 1: backend prepares real serialized transaction
      const prepRes = await fetch("/api/zk/tx/prepare", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ settlement_id: settlementId, wallet_address: wallet.address }),
      });
      if (!prepRes.ok) {
        const err = await prepRes.json();
        throw new Error(err.error ?? "tx preparation failed");
      }
      const { request_id, serialized_tx, network } = await prepRes.json();

      // Step 2: deserialize via @solana/web3.js (lazy import to avoid bundle bloat)
      const { Transaction, Connection, clusterApiUrl } = await import("@solana/web3.js");
      const txBytes = Buffer.from(serialized_tx, "base64");
      const tx = Transaction.from(txBytes);

      // Step 3: wallet signs the transaction
      const signedTx = await detected.provider.signTransaction(tx);

      // Step 4: submit signed tx to Solana
      const cluster = (network === "mainnet-beta" ? "mainnet-beta" : network) as any;
      const rpcUrl  = cluster === "mainnet-beta"
        ? "https://api.mainnet-beta.solana.com"
        : `https://api.${cluster}.solana.com`;
      const connection  = new Connection(rpcUrl, "confirmed");
      const rawTx       = signedTx.serialize();
      const txSignature = await connection.sendRawTransaction(rawTx, { skipPreflight: false, maxRetries: 3 });

      // Step 5: report back to backend
      const confirmRes = await fetch("/api/zk/tx/confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          request_id,
          tx_signature:  txSignature,
          wallet_address: wallet.address,
          network,
        }),
      });
      const confirmData = await confirmRes.json();

      setStatus("connected");
      return {
        tx_signature:  txSignature,
        explorer_url:  confirmData.explorer_url ?? "",
        status:        confirmData.status       ?? "submitted_on_chain",
      };
    } catch (err: any) {
      setError(err.message ?? "Transaction failed");
      setStatus("connected");
      return null;
    }
  }, [wallet]);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const detected = detectWallet();
    if (!detected?.provider?.publicKey) return;
    const address = detected.provider.publicKey.toBase58?.() ?? wallet.address;
    setWallet(prev => prev ? { ...prev, address, shortAddress: shortAddr(address) } : null);
    const id = await resolveIdentity(address, wallet.walletName);
    if (id) setIdentity(id);
  }, [wallet]);

  return (
    <WalletContext.Provider value={{
      status, wallet, identity, error, isInstalled,
      connect, disconnect, signMessage, signAndSubmitTx, refresh,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
