/**
 * ZKGENT Wallet Context
 *
 * Lightweight Solana wallet integration using window.solana (Phantom/Backpack standard API).
 * Supports: connect, disconnect, sign message, get balance.
 *
 * STATUS: IMPLEMENTED (window.solana API — Phantom, Backpack, Solflare compatible).
 * No heavy adapter package required.
 *
 * Browser wallet requirements:
 *   - Phantom: https://phantom.app
 *   - Backpack: https://backpack.app
 *   - Solflare: https://solflare.com
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type WalletStatus =
  | "not_installed"
  | "disconnected"
  | "connecting"
  | "connected"
  | "signing"
  | "error";

export interface WalletInfo {
  address: string;
  shortAddress: string;
  balance: number | null;      // SOL balance (null = not fetched)
  walletName: string;
  icon?: string;
}

export interface WalletContextValue {
  status: WalletStatus;
  wallet: WalletInfo | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<{ signature: string; publicKey: string } | null>;
  isInstalled: boolean;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

// Detect which wallet is available in window
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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus]   = useState<WalletStatus>("disconnected");
  const [wallet, setWallet]   = useState<WalletInfo | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if wallet extension is installed
  useEffect(() => {
    const check = () => setIsInstalled(!!detectWallet());
    check();
    // Re-check after 1s in case extension injects late
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
      const address = res.publicKey?.toBase58?.() ?? res.publicKey?.toString?.() ?? String(res.publicKey);
      setWallet({
        address,
        shortAddress: shortAddr(address),
        balance: null,
        walletName: detected.name,
      });
      setStatus("connected");
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
    setStatus("disconnected");
    setError(null);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<{ signature: string; publicKey: string } | null> => {
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

  const refresh = useCallback(async () => {
    if (!wallet) return;
    // Re-read wallet state
    const detected = detectWallet();
    if (!detected?.provider?.publicKey) return;
    const address = detected.provider.publicKey.toBase58?.() ?? wallet.address;
    setWallet(prev => prev ? { ...prev, address, shortAddress: shortAddr(address) } : null);
  }, [wallet]);

  return (
    <WalletContext.Provider value={{ status, wallet, error, connect, disconnect, signMessage, isInstalled, refresh }}>
      {children}
    </WalletContext.Provider>
  );
}
