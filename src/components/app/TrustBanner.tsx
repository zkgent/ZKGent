import { Link } from "@tanstack/react-router";

/**
 * Always-visible banner that explains the current trust model.
 * Critical for honest investor / user communication: this is devnet
 * alpha with operator-trusted (D1) crypto. Mainnet not supported.
 */
export function TrustBanner() {
  return (
    <div className="border-b border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-2 text-[11px] text-yellow-100/80">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-widest">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
          Devnet alpha · Early access
        </span>
        <span className="text-yellow-100/60">
          Operator-trusted (D1) — operator can see plaintext values. Do not use mainnet funds.
        </span>
        <Link
          to="/trust-model"
          className="ml-auto font-mono uppercase tracking-widest text-yellow-300 underline-offset-4 hover:underline"
        >
          Trust model →
        </Link>
      </div>
    </div>
  );
}
