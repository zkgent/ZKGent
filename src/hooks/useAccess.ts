import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";

export type AccessReason = null | "no_application" | "pending_review" | "rejected";

export type AccessApplication = {
  id: string;
  fullName: string;
  workEmail: string;
  company: string;
  status: string;
  walletAddress: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type AccessState = {
  loading: boolean;
  hasAccess: boolean;
  reason: AccessReason;
  application: AccessApplication | null;
  walletAddress: string | null;
  refresh: () => void;
};

/**
 * Polls /api/access/check for the currently connected wallet.
 * Returns hasAccess + status so UI can gate or show "pending review" state.
 */
export function useAccess(): AccessState {
  const { wallet } = useWallet();
  const walletAddress = wallet?.address ?? null;
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [reason, setReason] = useState<AccessReason>(null);
  const [application, setApplication] = useState<AccessApplication | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!walletAddress) {
      setHasAccess(false);
      setReason(null);
      setApplication(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/access/check?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setHasAccess(!!data.hasAccess);
        setReason(data.reason ?? null);
        setApplication(data.application ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setHasAccess(false);
        setReason("no_application");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress, tick]);

  return { loading, hasAccess, reason, application, walletAddress, refresh };
}
