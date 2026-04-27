/**
 * ZKGENT Wallet Connect Button + Identity Panel
 *
 * Shows connected wallet, identity fingerprint, and signTransaction status.
 */

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface WalletButtonProps {
  className?: string;
  compact?: boolean;
}

export function WalletButton({ className = "", compact = false }: WalletButtonProps) {
  const { status, wallet, connect, disconnect, isInstalled } = useWallet();

  const isConnecting = status === "connecting" || status === "signing";
  const isConnected = status === "connected" && wallet;
  const notInstalled = status === "not_installed" || (!isInstalled && status === "disconnected");

  if (notInstalled && !isConnecting) {
    return (
      <a
        href="https://phantom.app"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/8 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-yellow-400/70 hover:border-yellow-400/50 transition-colors ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
        {compact ? "No Wallet" : "Install Wallet"}
      </a>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={disconnect}
        title={`${wallet.walletName}: ${wallet.address}`}
        className={`group flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/8 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-emerald hover:border-red-400/30 hover:bg-red-400/8 hover:text-red-400 transition-colors ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald group-hover:bg-red-400 transition-colors" />
        {compact ? wallet.shortAddress : `${wallet.walletName} · ${wallet.shortAddress}`}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className={`flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors disabled:opacity-50 ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isConnecting ? "bg-cyan animate-pulse" : "bg-muted-foreground/40"}`}
      />
      {isConnecting ? "Connecting…" : compact ? "Connect" : "Connect Wallet"}
    </button>
  );
}

/**
 * Full wallet identity panel.
 * Shows identity fingerprint, session info, and signTransaction status.
 */
export function WalletStatusPanel() {
  const { status, wallet, identity, error, connect, disconnect, isInstalled, signMessage } =
    useWallet();
  const [testSigResult, setTestSigResult] = useState<string | null>(null);
  const isConnected = status === "connected" && wallet;

  const handleSignTest = async () => {
    if (!isConnected) return;
    setTestSigResult(null);
    const result = await signMessage(`zkgent:auth-test:${Date.now()}`);
    if (result) {
      setTestSigResult(result.signature.slice(0, 16) + "…");
    }
  };

  return (
    <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald animate-pulse" : "bg-muted-foreground/40"}`}
          />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Wallet Identity
          </p>
        </div>
        {isConnected && (
          <button
            onClick={disconnect}
            className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        {isConnected ? (
          <div className="space-y-2.5">
            {identity && (
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-muted-foreground/50">ID</span>
                <span className="font-mono text-[11px] text-cyan font-medium">
                  {identity.identity_fingerprint}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground/50">Provider</span>
              <span className="font-mono text-[11px] text-emerald">{wallet.walletName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground/50">Address</span>
              <span className="font-mono text-[10px] text-foreground">{wallet.shortAddress}</span>
            </div>
            {identity && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground/50">Sessions</span>
                  <span className="font-mono text-[10px] text-foreground">
                    {identity.session_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground/50">
                    Network Pref
                  </span>
                  <span
                    className={`font-mono text-[10px] ${identity.network_preference === "mainnet-beta" ? "text-emerald" : "text-yellow-400/70"}`}
                  >
                    {identity.network_preference}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground/50">Status</span>
              <span
                className={`font-mono text-[9px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${
                  status === "signing"
                    ? "border-cyan/20 bg-cyan/8 text-cyan"
                    : "border-emerald/20 bg-emerald/8 text-emerald"
                }`}
              >
                {status === "signing" ? "Signing…" : "Connected"}
              </span>
            </div>
            <div className="pt-1 border-t border-hairline">
              <p className="font-mono text-[9px] text-muted-foreground/40 mb-2">
                signTransaction ready · Ed25519 wallet signing
              </p>
              <button
                onClick={handleSignTest}
                disabled={status === "signing"}
                className="w-full font-mono text-[9px] uppercase tracking-wider border border-hairline rounded py-1.5 text-muted-foreground/50 hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
              >
                {status === "signing" ? "Signing…" : "Test Auth Signature"}
              </button>
              {testSigResult && (
                <p className="mt-1.5 font-mono text-[9px] text-emerald/70 truncate">
                  sig: {testSigResult}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            {error && <p className="text-[10px] text-red-400/80 text-center">{error}</p>}
            {!isInstalled && (
              <p className="text-[10px] text-muted-foreground/50 text-center">
                No Solana wallet detected.
                <br />
                <a
                  href="https://phantom.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan/70 hover:text-cyan underline"
                >
                  Install Phantom
                </a>{" "}
                or{" "}
                <a
                  href="https://backpack.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan/70 hover:text-cyan underline"
                >
                  Backpack
                </a>
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/40 text-center">
              Connect your wallet to get a personal identity and link settlements to your account.
            </p>
            <button
              onClick={connect}
              disabled={status === "connecting"}
              className="w-full font-mono text-[10px] uppercase tracking-wider border border-hairline rounded-lg py-2 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
            >
              {status === "connecting" ? "Connecting…" : "Connect Wallet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
