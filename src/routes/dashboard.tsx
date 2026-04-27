import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { api, type ZkSystemInfo, type DashboardStats, type ZkOnChainTx } from "@/lib/api";
import { WalletStatusPanel } from "@/components/wallet/WalletButton";

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
  queued:               "bg-yellow-400",
  note_created:         "bg-yellow-400",
  commitment_inserted:  "bg-yellow-400",
  proof_requested:      "bg-cyan",
  proof_generating:     "bg-cyan animate-pulse",
  proof_generated:      "bg-cyan",
  proof_verified:       "bg-emerald",
  signing_requested:    "bg-violet animate-pulse",
  signed:               "bg-violet",
  submitted_on_chain:   "bg-violet animate-pulse",
  confirmed:            "bg-emerald",
  finalized:            "bg-emerald",
  nullifier_published:  "bg-emerald",
  settled:              "bg-emerald",
  failed:               "bg-red-400",
  rolled_back:          "bg-red-400/60",
};

const CAT_COLORS: Record<string, string> = {
  transfer:    "text-emerald bg-emerald/10 border-emerald/20",
  payroll:     "text-cyan bg-cyan/10 border-cyan/20",
  treasury:    "text-violet bg-violet/10 border-violet/20",
  settlement:  "text-emerald bg-emerald/10 border-emerald/20",
  counterparty:"text-foreground bg-surface-elevated border-hairline",
  settings:    "text-muted-foreground bg-surface border-hairline",
  system:      "text-muted-foreground/60 bg-surface border-hairline",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, dot = "bg-muted-foreground/40", badge }: {
  label: string; value: string | number; sub?: string;
  dot?: string; badge?: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3.5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{label}</p>
        {badge && (
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/40 border border-hairline rounded px-1.5 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="text-[22px] font-semibold leading-none text-foreground tabular-nums">{fmtNum(Number(value))}</span>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground/50 pl-3.5">{sub}</p>}
    </div>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">{children}</p>
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
    settled:   "text-emerald border-emerald/20 bg-emerald/8",
    verified:  "text-emerald border-emerald/20 bg-emerald/8",
    generated: "text-cyan border-cyan/20 bg-cyan/8",
    generating:"text-cyan border-cyan/20 bg-cyan/8",
    pending:   "text-yellow-400 border-yellow-400/20 bg-yellow-400/8",
    queued:    "text-yellow-400 border-yellow-400/20 bg-yellow-400/8",
    failed:    "text-red-400 border-red-400/20 bg-red-400/8",
    scaffold:  "text-muted-foreground/60 border-hairline bg-surface",
  };
  const cls = colors[status] ?? "text-muted-foreground/50 border-hairline bg-surface";
  return (
    <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

function DashboardPage() {
  const [zk, setZk] = useState<ZkSystemInfo | null>(null);
  const [legacy, setLegacy] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solanaPing, setSolanaPing] = useState<"checking" | "ok" | "error">("checking");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.zk.system(), api.dashboard.get()])
      .then(([zkData, legacyData]) => {
        setZk(zkData);
        setLegacy(legacyData);
        setSolanaPing(zkData.solana.reachable ? "ok" : "error");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Workspace</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />Privacy Active
            </span>
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              solanaPing === "ok"
                ? "border-emerald/20 bg-emerald/8 text-emerald"
                : solanaPing === "error"
                  ? "border-red-400/20 bg-red-400/8 text-red-400"
                  : "border-hairline bg-surface text-muted-foreground"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${solanaPing === "ok" ? "bg-emerald" : solanaPing === "error" ? "bg-red-400" : "bg-muted-foreground/40 animate-pulse"}`} />
              Solana {loading ? "…" : zk?.solana.network ?? "Devnet"}
            </span>
            <button onClick={load} className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors">
              ↻ Refresh
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={item} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
            Failed to load: {error}
          </motion.div>
        )}

        {/* ── ZK System State ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>ZK System State</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-20 rounded-xl border border-hairline bg-surface animate-pulse" />
              ))
            ) : zk ? (
              <>
                <MetricCard label="Commitments" value={zk.commitments.total}
                  sub={`${zk.commitments.pending} pending`} dot="bg-cyan" />
                <MetricCard label="Nullifiers" value={zk.nullifiers.total}
                  sub="anti-double-spend" dot="bg-violet" />
                <MetricCard label="Active Notes" value={zk.notes.unspent}
                  sub={`${zk.notes.spent} spent`} dot="bg-emerald" />
                <MetricCard label="Total Notes" value={zk.notes.total}
                  sub={`${(zk.notes.total_shielded_value ?? 0).toLocaleString()} USDC`} dot="bg-emerald/60" />
                <MetricCard label="Proofs Verified" value={zk.proofs.verified}
                  sub={`${zk.proofs.generated} generated`} dot="bg-cyan" badge="scaffold" />
                <MetricCard label="Proofs Failed" value={zk.proofs.failed}
                  sub={`${zk.proofs.pending} pending`} dot="bg-red-400/60" />
                <MetricCard label="Settlements" value={zk.settlements.settled}
                  sub={`${zk.settlements.queued} queued`} dot="bg-emerald" />
                <MetricCard label="Merkle Leaves" value={zk.merkle.leaf_count}
                  sub={`depth ${zk.merkle.tree_depth}`} dot="bg-violet/60" />
              </>
            ) : null}
          </div>
        </motion.div>

        {/* ── Proof Pipeline ──────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>Proof Pipeline</SectionLabel>
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
            {loading ? (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto h-4 w-1/3 rounded bg-surface-elevated animate-pulse" />
              </div>
            ) : zk ? (
              <div className="divide-y divide-hairline">
                <div className="grid grid-cols-5 gap-0 text-center divide-x divide-hairline">
                  {[
                    { label: "Pending",    value: zk.proofs.pending,    dot: "bg-muted-foreground/40" },
                    { label: "Generating", value: zk.proofs.generating, dot: "bg-cyan animate-pulse" },
                    { label: "Generated",  value: zk.proofs.generated,  dot: "bg-cyan" },
                    { label: "Verified",   value: zk.proofs.verified,   dot: "bg-emerald" },
                    { label: "Failed",     value: zk.proofs.failed,     dot: "bg-red-400" },
                  ].map((p) => (
                    <div key={p.label} className="px-3 py-4 flex flex-col items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                      <span className="text-[18px] font-semibold text-foreground tabular-nums">{p.value}</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">{p.label}</span>
                    </div>
                  ))}
                </div>
                {/* Prover backend info */}
                <div className="px-5 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald shrink-0" />
                    <p className="font-mono text-[10px] text-emerald">
                      Backend: <strong>{zk.circuit?.prover_backend ?? "ed25519-operator-proof-v1"}</strong>
                      {" "}· Ed25519 signing (real cryptographic verification)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                    <p className="font-mono text-[10px] text-muted-foreground/50">
                      Prover pubkey: <span className="text-foreground/60">{zk.circuit?.prover_pubkey?.slice(0, 24) ?? "…"}…</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${zk.circuit?.transfer?.available ? "bg-emerald" : "bg-yellow-400/60"}`} />
                    <p className="font-mono text-[10px] text-yellow-400/70">
                      zk-SNARK circuit ({zk.circuit?.transfer?.id ?? "zkgent-transfer-v1"}):
                      {zk.circuit?.transfer?.available
                        ? " ✓ Available"
                        : " Pending — run: npm run circuits:build to compile .wasm + .zkey"}
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
            <Link to="/transfers" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition">
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
                <p className="text-[11px] text-muted-foreground/50">Create a transfer to initiate a confidential settlement</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-0 text-center divide-x divide-hairline">
                  {[
                    { label: "Queued",     value: zk?.settlements.queued ?? 0,      dot: "bg-yellow-400" },
                    { label: "In Progress",value: zk?.settlements.in_progress ?? 0, dot: "bg-cyan animate-pulse" },
                    { label: "Confirmed",  value: zk?.settlements.confirmed ?? 0,   dot: "bg-emerald/60" },
                    { label: "Finalized",  value: zk?.settlements.finalized ?? 0,   dot: "bg-emerald" },
                    { label: "Failed",     value: zk?.settlements.failed ?? 0,      dot: "bg-red-400" },
                  ].map((s) => (
                    <div key={s.label} className="px-3 py-3 flex flex-col items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      <span className="text-[18px] font-semibold text-foreground tabular-nums">{s.value}</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">{s.label}</span>
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
            <div className="border-b border-hairline px-5 py-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">On-chain Transactions</p>
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald border border-emerald/20 rounded px-1.5 py-0.5">devnet</span>
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">{[0,1,2].map(i=><div key={i} className="h-3 w-full rounded bg-surface-elevated animate-pulse"/>)}</div>
            ) : !zk || !zk.on_chain?.latest_txs?.length ? (
              <div className="px-5 py-6 flex flex-col items-center gap-2">
                <p className="font-mono text-[11px] text-muted-foreground/40">No on-chain txs yet</p>
                <p className="font-mono text-[10px] text-muted-foreground/30">Initiate a settlement to anchor on Solana devnet</p>
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {zk.on_chain.latest_txs.slice(0, 4).map((tx: ZkOnChainTx) => (
                  <div key={tx.id} className="px-5 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${tx.status === "confirmed" || tx.status === "finalized" ? "bg-emerald" : tx.status === "failed" ? "bg-red-400" : "bg-cyan animate-pulse"}`} />
                        <span className="font-mono text-[10px] text-foreground truncate">
                          {tx.signature === "N/A" ? "N/A (no SOL)" : `${tx.signature.slice(0, 16)}…`}
                        </span>
                      </div>
                      <span className={`font-mono text-[8px] uppercase tracking-wider shrink-0 border rounded px-1 py-0.5 ${tx.status === "confirmed" || tx.status === "finalized" ? "border-emerald/20 text-emerald" : tx.status === "failed" ? "border-red-400/20 text-red-400" : "border-cyan/20 text-cyan"}`}>
                        {tx.status}
                      </span>
                    </div>
                    {tx.explorer_url && (
                      <a href={tx.explorer_url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[9px] text-cyan/60 hover:text-cyan transition-colors ml-3">
                        View on Explorer →
                      </a>
                    )}
                  </div>
                ))}
                {zk.on_chain.operator_address && (
                  <div className="px-5 py-2.5 border-t border-hairline">
                    <p className="font-mono text-[9px] text-muted-foreground/40">
                      Operator: <span className="text-foreground/40">{zk.on_chain.operator_address.slice(0, 16)}…</span>
                    </p>
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
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Solana Network</p>
              <ScaffoldTag label="live rpc" />
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[0, 1, 2].map(i => <div key={i} className="h-3 w-full rounded bg-surface-elevated animate-pulse" />)}
              </div>
            ) : zk ? (
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Network",    value: zk.solana.network },
                  { label: "Status",     value: zk.solana.reachable ? "Reachable" : `Unreachable · ${zk.solana.error ?? ""}`,
                    dot: zk.solana.reachable ? "bg-emerald" : "bg-red-400" },
                  { label: "Slot",       value: fmtNum(zk.solana.slot) },
                  { label: "Epoch",      value: fmtNum(zk.solana.epoch) },
                  { label: "Commitment", value: "confirmed" },
                  { label: "Program",    value: "Not deployed", badge: "scaffold" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground/50">{row.label}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                      {row.dot && <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />}
                      {row.value}
                      {row.badge && <ScaffoldTag label={row.badge} />}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Keys */}
          <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
            <div className="border-b border-hairline px-5 py-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Key Status</p>
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-3 w-full rounded bg-surface-elevated animate-pulse" />)}
              </div>
            ) : zk ? (
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Operator",    value: zk.keys.operator_fingerprint },
                  { label: "Signing",     value: zk.keys.signing_fingerprint },
                  { label: "Encryption",  value: zk.keys.encryption_fingerprint },
                  { label: "Viewing",     value: zk.keys.viewing_fingerprint },
                  { label: "Custody",     value: zk.keys.custody_mode },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">{row.label}</span>
                    <span className="font-mono text-[10px] text-foreground truncate text-right">{row.value}</span>
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
                  { label: "Leaves",     value: fmtNum(zk.merkle.leaf_count) },
                  { label: "Tree Depth", value: String(zk.merkle.tree_depth) },
                  { label: "Capacity",   value: `${(zk.merkle.capacity / 1_000_000).toFixed(1)}M` },
                  { label: "Root",       value: fmtHash(zk.merkle.current_root, 12) },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">{m.label}</p>
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
                  { label: "Policy",      value: zk.disclosure.current_policy },
                  { label: "Audit Key",   value: zk.disclosure.audit_key_active ? "Active" : "Inactive",
                    dot: zk.disclosure.audit_key_active ? "bg-emerald" : "bg-red-400" },
                  { label: "Compliance Mode", value: zk.disclosure.compliance_mode ? "On" : "Off" },
                  { label: "View Key",    value: fmtHash(zk.disclosure.viewing_key_fingerprint, 14) },
                ].map((d) => (
                  <div key={d.label} className="flex flex-col gap-1">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">{d.label}</p>
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
              Array(4).fill(0).map((_, i) => <div key={i} className="h-20 rounded-xl border border-hairline bg-surface animate-pulse" />)
            ) : legacy ? (
              <>
                <MetricCard label="Transfers" value={legacy.transfers.total}
                  sub={`${legacy.transfers.pending} pending`} dot="bg-cyan" />
                <MetricCard label="Payroll Batches" value={legacy.payroll.total}
                  sub={`${legacy.payroll.draft} draft`} dot="bg-emerald" />
                <MetricCard label="Treasury Routes" value={legacy.treasury.total}
                  sub="configured" dot="bg-violet" />
                <MetricCard label="Counterparties" value={legacy.counterparties.total}
                  sub={`${legacy.counterparties.verified} verified`} dot="bg-emerald/60" />
              </>
            ) : null}
          </div>
        </motion.div>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <SectionLabel>
            Recent Activity
            <Link to="/activity" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition">
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
                <p className="text-[11px] text-muted-foreground/50">Actions you take will appear here</p>
              </div>
            ) : (
              legacy.recentActivity.map((ev) => {
                const catCls = CAT_COLORS[ev.category] ?? CAT_COLORS.system;
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition-colors">
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${catCls}`}>
                      {ev.category}
                    </span>
                    <p className="flex-1 min-w-0 text-[12px] text-foreground truncate">
                      {ev.event}{ev.detail ? ` · ${ev.detail}` : ""}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/40">{fmtDate(ev.createdAt)}</span>
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
  return <AppShell><DashboardPage /></AppShell>;
}

export default DashboardWrapper;
