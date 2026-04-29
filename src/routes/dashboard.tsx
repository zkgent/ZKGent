import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import {
  api,
  type ZkSystemInfo,
  type DashboardStats,
  type ZkOnChainTx,
  type WalletActivity,
  type ZkSolanaResponse,
  type ZkGroth16DemoResult,
} from "@/lib/api";
import { WalletStatusPanel } from "@/components/wallet/WalletButton";
import { useWallet } from "@/context/WalletContext";

const ADMIN_KEY_SS = "zkgent_admin_key";

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtHash(h: string | null | undefined, len = 8) {
  if (!h) return "—";
  return h.slice(0, len) + "…";
}
function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

const STATUS_DOT: Record<string, string> = {
  queued: "bg-yellow-400",
  note_created: "bg-yellow-400",
  commitment_inserted: "bg-yellow-400",
  proof_requested: "bg-cyan",
  proof_generating: "bg-cyan animate-pulse",
  proof_generated: "bg-cyan",
  proof_verified: "bg-emerald",
  signing_requested: "bg-violet animate-pulse",
  signed: "bg-violet",
  submitted_on_chain: "bg-violet animate-pulse",
  confirmed: "bg-emerald",
  finalized: "bg-emerald",
  nullifier_published: "bg-emerald",
  settled: "bg-emerald",
  failed: "bg-red-400",
  rolled_back: "bg-red-400/60",
};

const CAT_COLORS: Record<string, string> = {
  transfer: "text-emerald bg-emerald/10 border-emerald/20",
  payroll: "text-cyan bg-cyan/10 border-cyan/20",
  treasury: "text-violet bg-violet/10 border-violet/20",
  settlement: "text-emerald bg-emerald/10 border-emerald/20",
  counterparty: "text-foreground bg-surface-elevated border-hairline",
  settings: "text-muted-foreground bg-surface border-hairline",
  system: "text-muted-foreground/60 bg-surface border-hairline",
};

interface ProductionSnarkCircuit {
  id?: string;
  constraints?: number;
  proving_system?: string;
  hash?: string;
  curve?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  dot = "bg-muted-foreground/40",
  badge,
}: {
  label: string;
  value: string | number;
  sub?: string;
  dot?: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3.5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>
        {badge && (
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/40 border border-hairline rounded px-1.5 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="text-[22px] font-semibold leading-none text-foreground tabular-nums">
          {fmtNum(Number(value))}
        </span>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground/50 pl-3.5">{sub}</p>}
    </div>
  );
}

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
        {children}
      </p>
      {action}
    </div>
  );
}

function ScaffoldTag({ label = "scaffold" }: { label?: string }) {
  return (
    <span className="ml-2 font-mono text-[8px] uppercase tracking-wider border border-yellow-400/30 text-yellow-400/70 rounded px-1.5 py-0.5">
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    settled: "text-emerald border-emerald/20 bg-emerald/8",
    verified: "text-emerald border-emerald/20 bg-emerald/8",
    generated: "text-cyan border-cyan/20 bg-cyan/8",
    generating: "text-cyan border-cyan/20 bg-cyan/8",
    pending: "text-yellow-400 border-yellow-400/20 bg-yellow-400/8",
    queued: "text-yellow-400 border-yellow-400/20 bg-yellow-400/8",
    failed: "text-red-400 border-red-400/20 bg-red-400/8",
    scaffold: "text-muted-foreground/60 border-hairline bg-surface",
  };
  const cls = colors[status] ?? "text-muted-foreground/50 border-hairline bg-surface";
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

function DashboardPage() {
  const [zk, setZk] = useState<ZkSystemInfo | null>(null);
  const [legacy, setLegacy] = useState<DashboardStats | null>(null);
  const [solana, setSolana] = useState<ZkSolanaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solanaPing, setSolanaPing] = useState<"checking" | "ok" | "error">("checking");
  const [userActivity, setUserActivity] = useState<WalletActivity | null>(null);

  // Groth16 demo state
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<ZkGroth16DemoResult | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const { wallet, identity } = useWallet();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.zk.system(),
      api.dashboard.get(wallet?.address),
      api.zk.solana().catch(() => null),
    ])
      .then(([zkData, legacyData, solanaData]) => {
        setZk(zkData);
        setLegacy(legacyData);
        setSolana(solanaData);
        setSolanaPing(zkData.solana.reachable ? "ok" : "error");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wallet?.address]);

  const runGroth16Demo = useCallback(async () => {
    setDemoError(null);
    setDemoResult(null);
    // Session-scoped (cleared on tab close) — narrower XSS window than localStorage.
    let key = sessionStorage.getItem(ADMIN_KEY_SS) ?? "";
    if (!key) {
      const entered = window.prompt(
        "Admin key required (proving is CPU-expensive, ~600ms).\nSee ADMIN_KEY env on the server.",
      );
      if (!entered) return;
      key = entered.trim();
    }
    setDemoRunning(true);
    try {
      const r = await api.zk.groth16.demo({ adminKey: key });
      setDemoResult(r);
      // Only persist after a successful authenticated call.
      if (r.ok && r.verified) {
        sessionStorage.setItem(ADMIN_KEY_SS, key);
      }
    } catch (e) {
      const msg = (e as Error).message ?? "";
      // fetchJson throws on non-2xx — treat 401 / "unauthorized" body as bad key.
      if (/unauthorized|401|forbidden|403/i.test(msg)) {
        sessionStorage.removeItem(ADMIN_KEY_SS);
        setDemoError("Admin key rejected — clear and re-enter on next click.");
      } else {
        setDemoError(msg || "Demo failed");
      }
    } finally {
      setDemoRunning(false);
    }
  }, []);

  // Load per-user activity when wallet connects
  useEffect(() => {
    if (!wallet?.address) {
      setUserActivity(null);
      return;
    }
    api.identity
      .get(wallet.address)
      .then((d) => setUserActivity(d.activity))
      .catch(() => setUserActivity(null));
  }, [wallet?.address]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
              Workspace
            </p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              Privacy Active
            </span>
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                solanaPing === "ok"
                  ? "border-emerald/20 bg-emerald/8 text-emerald"
                  : solanaPing === "error"
                    ? "border-red-400/20 bg-red-400/8 text-red-400"
                    : "border-hairline bg-surface text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${solanaPing === "ok" ? "bg-emerald" : solanaPing === "error" ? "bg-red-400" : "bg-muted-foreground/40 animate-pulse"}`}
              />
              {loading ? "…" : (zk?.solana.network ?? "devnet").toUpperCase()}
            </span>
            {!loading && zk?.solana.network !== "mainnet-beta" && (
              <span className="flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-yellow-400/70">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
                Not Mainnet
              </span>
            )}
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            variants={item}
            className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400"
          >
            Failed to load: {error}
          </motion.div>
        )}

        {/* ── ZK Cryptographic Stack Banner ──────────────────────────────── */}
        {!loading && zk && (
          <motion.div
            variants={item}
            className="rounded-2xl border border-cyan/15 bg-cyan/5 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-cyan/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">
                  Cryptographic Stack
                </p>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                v{zk.system.version}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cyan/10">
              {/* Hash chain */}
              <div className="px-5 py-3.5 space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                  Hash chain
                </p>
                <p className="font-mono text-[12px] text-foreground">
                  {zk.hash_chain?.scheme ?? "poseidon-bn254-v1"}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground/60">
                  {zk.hash_chain?.curve ?? "BN254"} · ZK-friendly
                </p>
              </div>
              {/* Groth16 toolchain */}
              <div className="px-5 py-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                    Groth16 toolchain
                  </p>
                  {zk.groth16?.available && (
                    <span className="font-mono text-[8px] uppercase tracking-wider rounded px-1.5 py-0.5 border border-emerald/20 text-emerald">
                      ready
                    </span>
                  )}
                </div>
                <p className="font-mono text-[12px] text-foreground">
                  {zk.groth16?.circuit_id ?? "—"}
                </p>
                <p className="font-mono text-[10px] text-yellow-400/70">
                  {zk.groth16?.setup.circuit_constraints ?? 0} constraints · single-party setup
                </p>
              </div>
              {/* Production circuit */}
              <div className="px-5 py-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                    Production transfer SNARK
                  </p>
                  {zk.system.snark_ready && (
                    <span className="font-mono text-[8px] uppercase tracking-wider rounded px-1.5 py-0.5 border border-emerald/30 bg-emerald/10 text-emerald">
                      active
                    </span>
                  )}
                </div>
                {(() => {
                  const productionCircuit =
                    zk.system.snark_ready &&
                    typeof zk.system.snark_circuit === "object" &&
                    zk.system.snark_circuit !== null
                      ? (zk.system.snark_circuit as ProductionSnarkCircuit)
                      : null;

                  return (
                    <>
                      <p className="font-mono text-[12px] text-foreground">
                        {zk.system.snark_ready
                          ? (productionCircuit?.id ?? zk.system.snark_circuit ?? "—")
                          : "not built"}
                      </p>
                      {productionCircuit ? (
                        <>
                          <p className="font-mono text-[10px] text-emerald/80">
                            {productionCircuit.constraints?.toLocaleString() ?? "—"} R1CS ·{" "}
                            {productionCircuit.proving_system ?? "—"} ·{" "}
                            {productionCircuit.hash ?? "—"} / {productionCircuit.curve ?? "—"}
                          </p>
                          <p className="font-mono text-[9px] text-yellow-400/60">
                            ptau: Hermez (multi-party) · phase-2: single-party (devnet)
                          </p>
                        </>
                      ) : (
                        <p className="font-mono text-[10px] text-muted-foreground/60">
                          needs membership + balance circuit + multi-party setup
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            {/* Groth16 demo */}
            <div className="px-5 py-3 border-t border-cyan/10 flex items-center justify-between gap-3 flex-wrap">
              <p className="font-mono text-[10px] text-muted-foreground/60">
                Run a real Groth16 prove+verify cycle on the toy circuit (admin-gated):
              </p>
              <button
                onClick={runGroth16Demo}
                disabled={demoRunning || !zk.groth16?.available}
                className="rounded-md border border-cyan/30 bg-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan hover:bg-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {demoRunning ? "Proving…" : "Run Groth16 Demo"}
              </button>
            </div>
            {(demoResult || demoError) && (
              <div className="px-5 py-3 border-t border-cyan/10 bg-background/40">
                {demoError && <p className="font-mono text-[10px] text-red-400">{demoError}</p>}
                {demoResult?.ok && demoResult.verified && (
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] text-emerald">
                      ✓ Proof verified · prove {demoResult.prove_ms}ms · verify{" "}
                      {demoResult.verify_ms}ms
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground/60">
                      circuit: {demoResult.circuit} · hash: {demoResult.expected_hash?.slice(0, 24)}
                      …
                    </p>
                  </div>
                )}
                {demoResult && !demoResult.ok && demoResult.error !== "unauthorized" && (
                  <p className="font-mono text-[10px] text-red-400">
                    Failed: {demoResult.error ?? "unknown"}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Wallet Identity ──────────────────────────────────────────────── */}
        <motion.div variants={item}>
          {wallet && identity ? (
            <div className="rounded-2xl border border-emerald/15 bg-emerald/5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-emerald/10">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-emerald/70">
                    Your Wallet Identity
                  </p>
                </div>
                <span className="font-mono text-[10px] text-emerald/60 font-medium">
                  {identity.identity_fingerprint}
                </span>
              </div>
              <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">
                    Provider
                  </p>
                  <p className="font-mono text-[11px] text-foreground">{wallet.walletName}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">
                    Address
                  </p>
                  <p className="font-mono text-[11px] text-foreground">{wallet.shortAddress}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">
                    Sessions
                  </p>
                  <p className="font-mono text-[11px] text-foreground">{identity.session_count}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">
                    Network Pref
                  </p>
                  <p
                    className={`font-mono text-[11px] ${identity.network_preference === "mainnet-beta" ? "text-emerald" : "text-yellow-400/70"}`}
                  >
                    {identity.network_preference}
                  </p>
                </div>
              </div>
              {userActivity && (
                <div className="border-t border-emerald/10 px-5 py-3 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">
                      Your Settlements
                    </p>
                    <p className="font-mono text-[15px] font-semibold text-foreground">
                      {userActivity.settlements.length}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">
                      Signing Requests
                    </p>
                    <p className="font-mono text-[15px] font-semibold text-foreground">
                      {userActivity.signing_requests.length}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">
                      On-chain Txs
                    </p>
                    <p className="font-mono text-[15px] font-semibold text-foreground">
                      {userActivity.onchain_txs.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-hairline bg-surface px-5 py-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                  Wallet Identity
                </p>
                <p className="text-[13px] text-foreground">
                  Connect your Solana wallet to get a personal identity
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                  Your settlements, signing requests, and on-chain transactions will be linked to
                  your wallet address.
                </p>
              </div>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider border border-hairline rounded px-2 py-1 text-muted-foreground/40">
                No wallet
              </span>
            </div>
          )}
        </motion.div>

        {/* ── ZK System State ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>System State</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              Array(8)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl border border-hairline bg-surface animate-pulse"
                  />
                ))
            ) : zk ? (
              <>
                <MetricCard
                  label="Commitments"
                  value={zk.commitments.total}
                  sub={`${zk.commitments.pending} pending`}
                  dot="bg-cyan"
                />
                <MetricCard
                  label="Nullifiers"
                  value={zk.nullifiers.total}
                  sub="anti-double-spend"
                  dot="bg-violet"
                />
                <MetricCard
                  label="Active Notes"
                  value={zk.notes.unspent}
                  sub={`${zk.notes.spent} spent`}
                  dot="bg-emerald"
                />
                <MetricCard
                  label="Total Notes"
                  value={zk.notes.total}
                  sub={`${(zk.notes.total_shielded_value ?? 0).toLocaleString()} USDC`}
                  dot="bg-emerald/60"
                />
                <MetricCard
                  label="Proofs Verified"
                  value={zk.proofs.verified}
                  sub={`${zk.proofs.generated} generated`}
                  dot="bg-cyan"
                />
                <MetricCard
                  label="Proofs Failed"
                  value={zk.proofs.failed}
                  sub={`${zk.proofs.pending} pending`}
                  dot="bg-red-400/60"
                />
                <MetricCard
                  label="Settlements"
                  value={zk.settlements.finalized ?? zk.settlements.settled ?? 0}
                  sub={`${zk.settlements.queued} queued`}
                  dot="bg-emerald"
                />
                <MetricCard
                  label="Merkle Leaves"
                  value={zk.merkle.leaf_count}
                  sub={`depth ${zk.merkle.tree_depth}`}
                  dot="bg-violet/60"
                />
              </>
            ) : null}
          </div>
        </motion.div>

        {/* ── Authorization Proof Pipeline ────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>Authorization Proof Pipeline</SectionLabel>
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
            {loading ? (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto h-4 w-1/3 rounded bg-surface-elevated animate-pulse" />
              </div>
            ) : zk ? (
              <div className="divide-y divide-hairline">
                <div className="grid grid-cols-5 gap-0 text-center divide-x divide-hairline">
                  {[
                    { label: "Pending", value: zk.proofs.pending, dot: "bg-muted-foreground/40" },
                    {
                      label: "Generating",
                      value: zk.proofs.generating,
                      dot: "bg-cyan animate-pulse",
                    },
                    { label: "Generated", value: zk.proofs.generated, dot: "bg-cyan" },
                    { label: "Verified", value: zk.proofs.verified, dot: "bg-emerald" },
                    { label: "Failed", value: zk.proofs.failed, dot: "bg-red-400" },
                  ].map((p) => (
                    <div key={p.label} className="px-3 py-4 flex flex-col items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                      <span className="text-[18px] font-semibold text-foreground tabular-nums">
                        {p.value}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                        {p.label}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Prover backend info */}
                <div className="px-5 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald shrink-0" />
                    <p className="font-mono text-[10px] text-emerald">
                      Active: <strong>{zk.system.proof_type}</strong> ·{" "}
                      {zk.system.snark_ready
                        ? "Groth16 spend proof active"
                        : "Ed25519 operator authorization fallback"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                    <p className="font-mono text-[10px] text-muted-foreground/50">
                      Operator pubkey:{" "}
                      <span className="text-foreground/60">
                        {zk.circuit?.prover_pubkey?.slice(0, 24) ?? "…"}…
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${zk.circuit?.transfer?.available ? "bg-emerald" : "bg-muted-foreground/20"}`}
                    />
                    <p className="font-mono text-[10px] text-muted-foreground/40">
                      Transfer circuit ({zk.circuit?.transfer?.id ?? "zkgent-transfer-v1"}):
                      {zk.circuit?.transfer?.available
                        ? " ✓ Available"
                        : " Not active — requires Circom .wasm + .zkey compilation"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ── Settlement Queue ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>
            Settlement Queue
            <Link
              to="/transfers"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition"
            >
              View Transfers →
            </Link>
          </SectionLabel>
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden divide-y divide-hairline">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-surface-elevated shrink-0" />
                  <div className="h-3 w-2/3 rounded bg-surface-elevated" />
                </div>
              ))
            ) : zk && zk.settlements.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-[13px] text-muted-foreground">No settlements yet</p>
                <p className="text-[11px] text-muted-foreground/50">
                  Create a transfer to initiate a confidential settlement
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-0 text-center divide-x divide-hairline">
                  {[
                    { label: "Queued", value: zk?.settlements.queued ?? 0, dot: "bg-yellow-400" },
                    {
                      label: "In Progress",
                      value: zk?.settlements.in_progress ?? 0,
                      dot: "bg-cyan animate-pulse",
                    },
                    {
                      label: "Confirmed",
                      value: zk?.settlements.confirmed ?? 0,
                      dot: "bg-emerald/60",
                    },
                    {
                      label: "Finalized",
                      value: zk?.settlements.finalized ?? 0,
                      dot: "bg-emerald",
                    },
                    { label: "Failed", value: zk?.settlements.failed ?? 0, dot: "bg-red-400" },
                  ].map((s) => (
                    <div key={s.label} className="px-3 py-3 flex flex-col items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      <span className="text-[18px] font-semibold text-foreground tabular-nums">
                        {s.value}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Wallet + On-chain Transactions ──────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Wallet status */}
          <WalletStatusPanel />

          {/* On-chain transactions */}
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
            <div className="border-b border-hairline px-5 py-3 flex items-center justify-between gap-2 flex-wrap">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
                On-chain Transactions
              </p>
              <div className="flex items-center gap-1.5">
                {solana?.funded && (
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                      solana.funded.balance >= 0.05
                        ? "text-emerald border-emerald/20"
                        : "text-red-400 border-red-400/20"
                    }`}
                    title={`Operator balance — funded via ${solana.status.network} faucet`}
                  >
                    {solana.funded.balance.toFixed(4)} SOL
                  </span>
                )}
                <span
                  className={`font-mono text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                    zk?.solana.network === "mainnet-beta"
                      ? "text-emerald border-emerald/20"
                      : "text-yellow-400/70 border-yellow-400/20"
                  }`}
                >
                  {zk?.solana.network ?? "devnet"}
                </span>
              </div>
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-3 w-full rounded bg-surface-elevated animate-pulse" />
                ))}
              </div>
            ) : !zk || !zk.on_chain?.latest_txs?.length ? (
              <div className="px-5 py-6 flex flex-col items-center gap-2">
                <p className="font-mono text-[11px] text-muted-foreground/40">
                  No on-chain txs yet
                </p>
                <p className="font-mono text-[10px] text-muted-foreground/30">
                  Initiate a settlement to anchor on Solana devnet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {zk.on_chain.latest_txs.slice(0, 4).map((tx: ZkOnChainTx) => (
                  <div key={tx.id} className="px-5 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${tx.status === "confirmed" || tx.status === "finalized" ? "bg-emerald" : tx.status === "failed" ? "bg-red-400" : "bg-cyan animate-pulse"}`}
                        />
                        <span className="font-mono text-[10px] text-foreground truncate">
                          {tx.signature === "N/A"
                            ? "N/A (no SOL)"
                            : `${tx.signature.slice(0, 16)}…`}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[8px] uppercase tracking-wider shrink-0 border rounded px-1 py-0.5 ${tx.status === "confirmed" || tx.status === "finalized" ? "border-emerald/20 text-emerald" : tx.status === "failed" ? "border-red-400/20 text-red-400" : "border-cyan/20 text-cyan"}`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    {tx.explorer_url && (
                      <a
                        href={tx.explorer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-cyan/60 hover:text-cyan transition-colors ml-3"
                      >
                        View on Explorer →
                      </a>
                    )}
                  </div>
                ))}
                {zk.on_chain.operator_address && (
                  <div className="px-5 py-2.5 border-t border-hairline flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-mono text-[9px] text-muted-foreground/40">
                      Operator:{" "}
                      <span className="text-foreground/40">
                        {zk.on_chain.operator_address.slice(0, 16)}…
                      </span>
                    </p>
                    {zk.solana.network === "devnet" && (
                      <a
                        href={`https://explorer.solana.com/address/${zk.on_chain.operator_address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-cyan/60 hover:text-cyan transition-colors"
                      >
                        View on Explorer →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Solana Network + Key Status ──────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Solana */}
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
            <div className="border-b border-hairline px-5 py-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
                Solana Network
              </p>
              {zk && !loading && (
                <span
                  className={`font-mono text-[9px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${
                    zk.solana.network === "mainnet-beta"
                      ? "border-emerald/20 text-emerald"
                      : "border-yellow-400/30 text-yellow-400/70"
                  }`}
                >
                  {zk.solana.network === "mainnet-beta" ? "Mainnet" : "Non-mainnet"}
                </span>
              )}
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-3 w-full rounded bg-surface-elevated animate-pulse" />
                ))}
              </div>
            ) : zk ? (
              <div className="px-5 py-4 space-y-3">
                {zk.solana.network !== "mainnet-beta" && (
                  <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-3 py-2">
                    <p className="font-mono text-[9px] text-yellow-400/70">
                      Running on <strong>{zk.solana.network}</strong> — not production mainnet. Set{" "}
                      <code>SOLANA_NETWORK=mainnet-beta</code> for production.
                    </p>
                  </div>
                )}
                {[
                  { label: "Cluster", value: zk.solana.network },
                  {
                    label: "Status",
                    value: zk.solana.reachable
                      ? "Reachable"
                      : `Unreachable · ${zk.solana.error ?? ""}`,
                    dot: zk.solana.reachable ? "bg-emerald" : "bg-red-400",
                  },
                  { label: "Slot", value: fmtNum(zk.solana.slot) },
                  { label: "Epoch", value: fmtNum(zk.solana.epoch) },
                  { label: "Commitment", value: "confirmed" },
                  { label: "Custom Program", value: "Not deployed yet" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {row.label}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                      {row.dot && <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />}
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Keys */}
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
            <div className="border-b border-hairline px-5 py-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
                Key Status
              </p>
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-3 w-full rounded bg-surface-elevated animate-pulse" />
                ))}
              </div>
            ) : zk ? (
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Operator", value: zk.keys.operator_fingerprint },
                  { label: "Signing", value: zk.keys.signing_fingerprint },
                  { label: "Encryption", value: zk.keys.encryption_fingerprint },
                  { label: "Viewing", value: zk.keys.viewing_fingerprint },
                  { label: "Custody", value: zk.keys.custody_mode },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
                      {row.label}
                    </span>
                    <span className="font-mono text-[10px] text-foreground truncate text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
                <div className="pt-1 border-t border-hairline">
                  <p className="font-mono text-[9px] text-muted-foreground/40">
                    No private key material is ever stored in DB or exposed via API.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ── Merkle Tree ──────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>
            Merkle Accumulator <ScaffoldTag label="sha-256 · poseidon pending" />
          </SectionLabel>
          <div className="rounded-2xl border border-hairline bg-surface px-5 py-4 space-y-3">
            {loading ? (
              <div className="h-4 w-1/2 rounded bg-surface-elevated animate-pulse" />
            ) : zk ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Leaves", value: fmtNum(zk.merkle.leaf_count) },
                  { label: "Tree Depth", value: String(zk.merkle.tree_depth) },
                  { label: "Capacity", value: `${(zk.merkle.capacity / 1_000_000).toFixed(1)}M` },
                  { label: "Root", value: fmtHash(zk.merkle.current_root, 12) },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                      {m.label}
                    </p>
                    <p className="mt-1 font-mono text-[12px] text-foreground">{m.value || "—"}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ── Disclosure + Compliance ──────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>
            Disclosure & Compliance <ScaffoldTag label="range proof pending" />
          </SectionLabel>
          <div className="rounded-2xl border border-hairline bg-surface px-5 py-4">
            {loading ? (
              <div className="h-4 w-1/2 rounded bg-surface-elevated animate-pulse" />
            ) : zk ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Policy", value: zk.disclosure.current_policy },
                  {
                    label: "Audit Key",
                    value: zk.disclosure.audit_key_active ? "Active" : "Inactive",
                    dot: zk.disclosure.audit_key_active ? "bg-emerald" : "bg-red-400",
                  },
                  { label: "Compliance Mode", value: zk.disclosure.compliance_mode ? "On" : "Off" },
                  { label: "View Key", value: fmtHash(zk.disclosure.viewing_key_fingerprint, 14) },
                ].map((d) => (
                  <div key={d.label} className="flex flex-col gap-1">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                      {d.label}
                    </p>
                    <p className="flex items-center gap-1.5 font-mono text-[12px] text-foreground">
                      {"dot" in d && <span className={`h-1.5 w-1.5 rounded-full ${d.dot}`} />}
                      {d.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ── Operational Stats ────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>Operational Metrics</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {loading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl border border-hairline bg-surface animate-pulse"
                  />
                ))
            ) : legacy ? (
              <>
                <MetricCard
                  label="Transfers"
                  value={legacy.transfers.total}
                  sub={`${legacy.transfers.pending} pending`}
                  dot="bg-cyan"
                />
                <MetricCard
                  label="Payroll Batches"
                  value={legacy.payroll.total}
                  sub={`${legacy.payroll.draft} draft`}
                  dot="bg-emerald"
                />
                <MetricCard
                  label="Treasury Routes"
                  value={legacy.treasury.total}
                  sub="configured"
                  dot="bg-violet"
                />
                <MetricCard
                  label="Counterparties"
                  value={legacy.counterparties.total}
                  sub={`${legacy.counterparties.verified} verified`}
                  dot="bg-emerald/60"
                />
              </>
            ) : null}
          </div>
        </motion.div>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>
            Recent Activity
            <Link
              to="/activity"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition"
            >
              View all →
            </Link>
          </SectionLabel>
          <div className="rounded-2xl border border-hairline bg-surface divide-y divide-hairline overflow-hidden">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-surface-elevated shrink-0" />
                  <div className="h-3 w-2/3 rounded bg-surface-elevated" />
                </div>
              ))
            ) : !legacy || legacy.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-[13px] text-muted-foreground">No activity yet</p>
                <p className="text-[11px] text-muted-foreground/50">
                  Actions you take will appear here
                </p>
              </div>
            ) : (
              legacy.recentActivity.map((ev) => {
                const catCls = CAT_COLORS[ev.category] ?? CAT_COLORS.system;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition-colors"
                  >
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${catCls}`}
                    >
                      {ev.category}
                    </span>
                    <p className="flex-1 min-w-0 text-[12px] text-foreground truncate">
                      {ev.event}
                      {ev.detail ? ` · ${ev.detail}` : ""}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/40">
                      {fmtDate(ev.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function DashboardWrapper() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}

export default DashboardWrapper;
