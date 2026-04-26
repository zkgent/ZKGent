import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/payroll")({
  component: PayrollWrapper,
});

const BATCHES = [
  {
    id: "PR-2024-Q2-ENG",
    name: "Engineering · Q2 2024",
    recipients: 24,
    status: "draft",
    scheduled: "May 1, 2024",
    approvals: "1 / 2",
    rail: "USDC",
    createdAt: "Apr 25",
  },
  {
    id: "PR-2024-Q1-ALL",
    name: "All Staff · Q1 2024",
    recipients: 61,
    status: "settled",
    scheduled: "Apr 1, 2024",
    approvals: "2 / 2",
    rail: "USDC",
    createdAt: "Mar 28",
  },
  {
    id: "PR-2024-Q1-CON",
    name: "Contractors · Q1 2024",
    recipients: 11,
    status: "settled",
    scheduled: "Apr 1, 2024",
    approvals: "2 / 2",
    rail: "USDC",
    createdAt: "Mar 28",
  },
  {
    id: "PR-2023-Q4-ENG",
    name: "Engineering · Q4 2023",
    recipients: 22,
    status: "settled",
    scheduled: "Jan 1, 2024",
    approvals: "2 / 2",
    rail: "USDC",
    createdAt: "Dec 29",
  },
];

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  draft: { label: "Draft", dot: "bg-cyan", badge: "border-cyan/20 bg-cyan/8 text-cyan" },
  pending: { label: "Pending", dot: "bg-yellow-500/70", badge: "border-yellow-500/20 bg-yellow-500/8 text-yellow-400" },
  settled: { label: "Settled", dot: "bg-emerald/60", badge: "border-emerald/15 bg-emerald/5 text-emerald/70" },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function PayrollPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-5xl mx-auto">

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Payroll</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="rounded-full border border-hairline px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground transition">
                Import Recipients
              </button>
              <button onClick={() => setShowCreate(!showCreate)}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2 text-[12px] font-medium text-background transition hover:opacity-90">
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Create Batch</span>
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Recipients", value: "72", sub: "across all batches" },
              { label: "Next Run", value: "May 1", sub: "Engineering Q2 · Draft" },
              { label: "Last Settled", value: "Apr 1", sub: "All Staff Q1 · $[hidden]" },
              { label: "Privacy Mode", value: "Active", sub: "USDC · Shielded channel" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-hairline bg-surface px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{s.label}</p>
                <p className="mt-1 text-[15px] font-semibold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* Create batch CTA */}
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-hairline bg-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[15px] font-semibold text-foreground">Create Payroll Batch</h3>
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { l: "Batch name", p: "e.g. Engineering Q3 2024" },
                  { l: "Scheduled date", p: "Disbursement date" },
                  { l: "Payment rail", p: "USDC · Shielded" },
                  { l: "Approval threshold", p: "Required signers" },
                ].map(({ l, p }) => (
                  <div key={l}>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</label>
                    <input placeholder={p}
                      className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-hairline bg-background px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                <span className="text-[11px] text-muted-foreground">Recipient import and ZK proof generation will be available once the proof engine is active.</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={() => setShowCreate(false)} className="rounded-full border border-hairline px-5 py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition">Cancel</button>
                <button className="rounded-full bg-foreground px-5 py-2.5 text-[12px] font-medium text-background hover:opacity-90 transition">Save Draft</button>
              </div>
            </motion.div>
          )}

          {/* Batch list */}
          <motion.div variants={item}>
            <div className="rounded-2xl border border-hairline overflow-hidden">
              <div className="border-b border-hairline bg-surface-elevated px-5 py-2.5 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
                {["Batch", "Recipients", "Scheduled", "Status", "Approvals"].map((h) => (
                  <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-hairline">
                {BATCHES.map((b) => {
                  const meta = STATUS_META[b.status];
                  return (
                    <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-surface-elevated transition-colors cursor-default">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{b.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground/60">{b.id}</p>
                      </div>
                      <span className="font-mono text-[12px] text-foreground text-center">{b.recipients}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{b.scheduled}</span>
                      <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1", meta.badge)}>
                        <div className={`h-1 w-1 rounded-full ${meta.dot}`} />
                        <span className="font-mono text-[9px] uppercase tracking-wider">{meta.label}</span>
                      </div>
                      <div className="text-center">
                        <span className="font-mono text-[11px] text-muted-foreground">{b.approvals}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Recipients note */}
          <motion.div variants={item}
            className="rounded-xl border border-hairline bg-surface p-4 flex items-start gap-3">
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500/70" />
            <div>
              <p className="text-[13px] font-medium text-foreground">Recipient list not yet imported</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Import a CSV of recipient addresses and amounts. All amounts are shielded before disbursement — counterparties will not be able to observe salary values on-chain.</p>
              <button className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-[12px] text-foreground hover:border-emerald/30 transition">
                Import Recipients →
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function PayrollWrapper() {
  return <AppShell><PayrollPage /></AppShell>;
}

export default PayrollWrapper;
