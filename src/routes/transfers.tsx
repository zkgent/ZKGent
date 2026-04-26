import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transfers")({
  component: TransfersWrapper,
});

type Status = "pending" | "verified" | "settled" | "failed" | "all";

const TRANSFERS = [
  {
    id: "OBD-T-2847",
    status: "pending",
    type: "Standard",
    created: "Apr 26 · 10:42",
    settled: null,
    proofState: "Generating",
    notes: "Ops disbursement Q2",
    rail: "USDC",
    region: "North America",
  },
  {
    id: "OBD-T-2846",
    status: "verified",
    type: "High-value",
    created: "Apr 26 · 08:15",
    settled: null,
    proofState: "Verified",
    notes: "Treasury rebalance",
    rail: "SOL",
    region: "Europe",
  },
  {
    id: "OBD-T-2845",
    status: "settled",
    type: "Payroll",
    created: "Apr 25 · 16:00",
    settled: "Apr 25 · 16:01",
    proofState: "Finalized",
    notes: "Engineering payroll Apr",
    rail: "USDC",
    region: "North America",
  },
  {
    id: "OBD-T-2844",
    status: "settled",
    type: "Standard",
    created: "Apr 25 · 11:30",
    settled: "Apr 25 · 11:30",
    proofState: "Finalized",
    notes: "Vendor payment · Vertex Capital",
    rail: "USDC",
    region: "Asia-Pacific",
  },
  {
    id: "OBD-T-2843",
    status: "failed",
    type: "Standard",
    created: "Apr 24 · 14:20",
    settled: null,
    proofState: "Failed",
    notes: "Proof timeout — retry required",
    rail: "SOL",
    region: "Latin America",
  },
  {
    id: "OBD-T-2842",
    status: "settled",
    type: "Treasury",
    created: "Apr 24 · 09:00",
    settled: "Apr 24 · 09:01",
    proofState: "Finalized",
    notes: "Ops Reserve allocation",
    rail: "USDC",
    region: "North America",
  },
];

const STATUS_META: Record<string, { label: string; dot: string; text: string; badge: string }> = {
  pending: { label: "Pending", dot: "bg-cyan", text: "text-cyan", badge: "border-cyan/20 bg-cyan/8 text-cyan" },
  verified: { label: "Verified", dot: "bg-emerald", text: "text-emerald", badge: "border-emerald/20 bg-emerald/8 text-emerald" },
  settled: { label: "Settled", dot: "bg-emerald/60", text: "text-emerald/70", badge: "border-emerald/15 bg-emerald/5 text-emerald/70" },
  failed: { label: "Failed", dot: "bg-red-500/60", text: "text-red-400", badge: "border-red-500/20 bg-red-500/8 text-red-400" },
};

const FILTERS: { id: Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "settled", label: "Settled" },
  { id: "failed", label: "Failed" },
];

function NewTransferPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-foreground">New Confidential Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan/5 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan/70">ZK proof engine · In setup</span>
        </div>

        <div className="space-y-3">
          {[
            { l: "Recipient address", p: "Solana wallet address" },
            { l: "Amount (USDC)", p: "Hidden in transit" },
            { l: "Reference", p: "Internal label (not on-chain)" },
          ].map(({ l, p }) => (
            <div key={l}>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</label>
              <input type="text" placeholder={p}
                className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
            </div>
          ))}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rail</label>
            <select className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
              <option>USDC · Shielded</option>
              <option>SOL · Confidential</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">
            Cancel
          </button>
          <button className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition">
            Initiate Transfer
          </button>
        </div>
        <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground/40">Transfer will be queued for ZK proof generation</p>
      </motion.div>
    </div>
  );
}

function TransfersPage() {
  const [filter, setFilter] = useState<Status>("all");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const visible = filter === "all" ? TRANSFERS : TRANSFERS.filter((t) => t.status === filter);
  const counts = FILTERS.map((f) => ({
    ...f,
    count: f.id === "all" ? TRANSFERS.length : TRANSFERS.filter((t) => t.status === f.id).length,
  }));

  const selectedTransfer = TRANSFERS.find((t) => t.id === selected);

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-5 py-8 lg:px-8">

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Transfers</h1>
          </div>
          <button onClick={() => setShowNew(true)}
            className="group relative shrink-0 inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition hover:opacity-90">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">+ New Transfer</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="mb-5 flex flex-wrap gap-2">
          {counts.map((f) => {
            const meta = STATUS_META[f.id as string];
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn("flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all",
                  filter === f.id
                    ? "border-emerald/30 bg-emerald/10 text-emerald"
                    : "border-hairline bg-surface text-muted-foreground hover:border-foreground/20")}>
                {meta && <div className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
                {f.label} {f.count > 0 && <span className="opacity-60">· {f.count}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4">
          {/* Transfer list */}
          <div className={`flex-1 min-w-0 rounded-2xl border border-hairline overflow-hidden ${selected ? "hidden lg:block" : ""}`}>
            <div className="border-b border-hairline bg-surface-elevated px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-4">
              {["Transfer ID", "Status", "Rail", "Created"].map((h) => (
                <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">{h}</span>
              ))}
            </div>
            {visible.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-[13px]">No transfers found</div>
            ) : (
              <div className="divide-y divide-hairline">
                {visible.map((t) => {
                  const meta = STATUS_META[t.status];
                  return (
                    <button key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)}
                      className={cn("w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-elevated",
                        selected === t.id && "bg-emerald/[0.04] border-l-2 border-l-emerald/40")}>
                      <div>
                        <p className="font-mono text-[12px] font-medium text-foreground">{t.id}</p>
                        <p className="text-[11px] text-muted-foreground">{t.notes}</p>
                      </div>
                      <div className={cn("self-center flex items-center gap-1.5 rounded-full border px-2.5 py-1", meta.badge)}>
                        <div className={`h-1 w-1 rounded-full ${meta.dot}`} />
                        <span className="font-mono text-[9px] uppercase tracking-wider">{meta.label}</span>
                      </div>
                      <span className="self-center font-mono text-[11px] text-muted-foreground">{t.rail}</span>
                      <span className="self-center font-mono text-[10px] text-muted-foreground/60">{t.created}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedTransfer && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              className="w-full lg:w-72 xl:w-80 shrink-0 rounded-2xl border border-hairline bg-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground/60">{selectedTransfer.id}</p>
                  <p className="text-[13px] font-medium text-foreground">{selectedTransfer.type} Transfer</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { l: "Status", v: STATUS_META[selectedTransfer.status].label, accent: STATUS_META[selectedTransfer.status].text },
                  { l: "Proof state", v: selectedTransfer.proofState },
                  { l: "Rail", v: selectedTransfer.rail },
                  { l: "Region", v: selectedTransfer.region },
                  { l: "Created", v: selectedTransfer.created },
                  { l: "Settled", v: selectedTransfer.settled || "—" },
                  { l: "Notes", v: selectedTransfer.notes },
                ].map(({ l, v, accent }) => (
                  <div key={l} className="flex items-start justify-between gap-4 py-1.5 border-b border-hairline last:border-0">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 shrink-0">{l}</span>
                    <span className={`text-[12px] text-right ${accent || "text-foreground"}`}>{v}</span>
                  </div>
                ))}
                <div className="pt-2 space-y-2">
                  {[
                    { l: "Sender", v: "shielded", col: "text-emerald" },
                    { l: "Receiver", v: "shielded", col: "text-violet" },
                    { l: "Amount", v: "protected", col: "text-cyan" },
                  ].map(({ l, v, col }) => (
                    <div key={l} className="flex items-center justify-between rounded-lg border border-hairline bg-surface-elevated px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">{l}</span>
                      <span className={`font-mono text-[10px] font-medium ${col}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {showNew && <NewTransferPanel onClose={() => setShowNew(false)} />}
    </div>
  );
}

function TransfersWrapper() {
  return <AppShell><TransfersPage /></AppShell>;
}

export default TransfersWrapper;
