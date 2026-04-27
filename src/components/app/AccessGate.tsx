import { ReactNode, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { useAccess } from "@/hooks/useAccess";
import { useApplication } from "@/context/ApplicationContext";

/**
 * Wraps any page that requires early-access approval.
 * Renders children when wallet is connected AND an approved application is linked.
 * Otherwise shows the appropriate state: not connected / no application /
 * pending review / rejected, with a clear next step.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { wallet, status, connect } = useWallet();
  const access = useAccess();
  const { applicationId } = useApplication();
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Wallet not connected — explain why we need it.
  if (!wallet) {
    return (
      <Wrapper title="Connect your Solana wallet">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          ZKGENT early access is gated to approved wallets. Connect a Solana wallet (Phantom,
          Backpack, Solflare) to check your access status.
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={() => connect()}
            disabled={status === "connecting"}
            className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-50"
          >
            {status === "connecting" ? "Connecting…" : "Connect Wallet"}
          </button>
          <Link
            to="/apply"
            className="rounded-full border border-hairline px-5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition"
          >
            Apply for access →
          </Link>
        </div>
      </Wrapper>
    );
  }

  if (access.loading) {
    return (
      <Wrapper title="Checking access…">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-emerald" />
          <span className="font-mono text-[11px] uppercase tracking-wider">verifying wallet</span>
        </div>
      </Wrapper>
    );
  }

  // Approved
  if (access.hasAccess) {
    return <>{children}</>;
  }

  // Wallet connected but no application on file.
  // If user has an applicationId in their browser (from the apply flow)
  // they can claim/link this wallet to it.
  if (access.reason === "no_application") {
    if (applicationId) {
      const linkWallet = async () => {
        setLinking(true);
        setLinkError(null);
        try {
          const res = await fetch("/api/access/link-wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId, walletAddress: wallet.address }),
          });
          const data = await res.json();
          if (!res.ok) {
            setLinkError(data.hint || data.error || "Could not link wallet.");
            return;
          }
          access.refresh();
        } catch {
          setLinkError("Network error.");
        } finally {
          setLinking(false);
        }
      };
      return (
        <Wrapper title="Link this wallet to your application">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            You have an application on file (
            <span className="font-mono text-foreground">{applicationId}</span>). Link this wallet to
            it so we know which one to grant access to once approved.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={linkWallet}
              disabled={linking}
              className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-50"
            >
              {linking ? "Linking…" : "Link wallet"}
            </button>
            <Link
              to="/submitted"
              className="rounded-full border border-hairline px-5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition"
            >
              View status
            </Link>
          </div>
          {linkError && <p className="text-[12px] text-destructive">{linkError}</p>}
        </Wrapper>
      );
    }

    return (
      <Wrapper title="Apply for early access">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Your wallet is not on the approved list yet. ZKGENT is invitation-only during devnet alpha
          — every operator and team is reviewed before joining.
        </p>
        <div className="flex gap-2.5">
          <Link
            to="/apply"
            className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition"
          >
            Request early access →
          </Link>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground/60">
          Wallet: {wallet.shortAddress}
        </p>
      </Wrapper>
    );
  }

  if (access.reason === "pending_review") {
    return (
      <Wrapper title="Application under review">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Thanks
          {access.application?.fullName ? `, ${access.application.fullName.split(" ")[0]}` : ""}!
          Your application is in our review queue. We will unlock product access for this wallet as
          soon as you are approved (typically 5–7 business days).
        </p>
        <div className="flex gap-2.5">
          <Link
            to="/submitted"
            className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition"
          >
            View application status →
          </Link>
          <button
            onClick={() => access.refresh()}
            className="rounded-full border border-hairline px-5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition"
          >
            Refresh
          </button>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground/60">
          Application: {access.application?.id} · Wallet: {wallet.shortAddress}
        </p>
      </Wrapper>
    );
  }

  // Rejected
  return (
    <Wrapper title="Access not granted">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        This application was not approved for the current early-access cohort. If you believe this
        is a mistake or your situation has changed, please reach out to the ZKGENT team.
      </p>
      <p className="font-mono text-[10px] text-muted-foreground/60">
        Application: {access.application?.id} · Wallet: {wallet.shortAddress}
      </p>
    </Wrapper>
  );
}

function Wrapper({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md space-y-5 rounded-2xl border border-hairline bg-surface p-6"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.08]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Early access
          </span>
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
        {children}
      </motion.div>
    </div>
  );
}
