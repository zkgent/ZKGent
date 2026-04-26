import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  component: ActivityWrapper,
});

type EventCategory = "all" | "transfer" | "payroll" | "treasury" | "counterparty" | "settings" | "system";

const EVENTS = [
  { id: "EVT-1041", category: "transfer" as const, event: "Transfer initiated", detail: "OBD-T-2847 · USDC · North America", operator: "operator@obsidian", ts: "Apr 26, 10:42", status: "pending" },
  { id: "EVT-1040", category: "payroll" as const, event: "Payroll draft created", detail: "Engineering Q2 2024 · 24 recipients · May 1 scheduled", operator: "operator@obsidian", ts: "Apr 26, 09:55", status: "info" },
  { id: "EVT-1039", category: "counterparty" as const, event: "Counterparty added", detail: "Horizon Remit Ltd · Latin America · KYC invitation sent", operator: "operator@obsidian", ts: "Apr 26, 08:30", status: "info" },
  { id: "EVT-1038", category: "transfer" as const, event: "Transfer verified", detail: "OBD-T-2846 · ZK proof verified · SOL", operator: "system", ts: "Apr 26, 08:16", status: "ok" },
  { id: "EVT-1037", category: "treasury" as const, event: "Treasury route updated", detail: "Ops Reserve · Auto-rebalance policy enabled", operator: "operator@obsidian", ts: "Apr 25, 17:00", status: "info" },
  { id: "EVT-1036", category: "transfer" as const, event: "Transfer settled", detail: "OBD-T-2845 · Payroll disbursement · 24 addresses settled", operator: "system", ts: "Apr 25, 16:01", status: "ok" },
  { id: "EVT-1035", category: "payroll" as const, event: "Payroll approved", detail: "Engineering Q2 draft · 2/2 signers confirmed", operator: "cosigner@obsidian", ts: "Apr 25, 15:58", status: "ok" },
  { id: "EVT-1034", category: "transfer" as const, event: "Transfer settled", detail: "OBD-T-2844 · Vendor · Vertex Capital Partners", operator: "system", ts: "Apr 25, 11:31", status: "ok" },
  { id: "EVT-1033", category: "transfer" as const, event: "Transfer failed", detail: "OBD-T-2843 · Proof generation timeout · Retry required", operator: "system", ts: "Apr 24, 14:21", status: "fail" },
  { id: "EVT-1032", category: "settings" as const, event: "Disclosure policy set", detail: "Audit-only mode · Compliance key fingerprint registered", operator: "admin@obsidian", ts: "Apr 24, 10:00", status: "info" },
  { id: "EVT-1031", category: "counterparty" as const, event: "KYC verified", detail: "Vertex Capital Partners · Verification completed", operator: "system", ts: "Apr 24, 09:45", status: "ok" },
  { id: "EVT-1030", category: "treasury" as const, event: "Treasury movement settled", detail: "Ops Reserve → Shielded Pool A · $[hidden]", operator: "system", ts: "Apr 24, 09:01", status: "ok" },
  { id: "EVT-1029", category: "system" as const, event: "Workspace initialized", detail: "OBSIDIAN confidential console · Privacy mode active", operator: "system", ts: "Apr 23, 12:00", status: "info" },
];

const CAT_META: Record<string, { label: string; dot: string; badge: string }> = {
  transfer: { label: "Transfer", dot: "bg-emerald", badge: "border-emerald/20 bg-emerald/8 text-emerald" },
  payroll: { label: "Payroll", dot: "bg-cyan", badge: "border-cyan/20 bg-cyan/8 text-cyan" },
  treasury: { label: "Treasury", dot: "bg-violet", badge: "border-violet/20 bg-violet/8 text-violet" },
  counterparty: { label: "Counterparty", dot: "bg-foreground/40", badge: "border-hairline bg-surface-elevated text-foreground" },
  settings: { label: "Settings", dot: "bg-muted-foreground/50", badge: "border-hairline bg-surface text-muted-foreground" },
  system: { label: "System", dot: "bg-muted-foreground/30", badge: "border-hairline bg-surface text-muted-foreground/70" },
};

const STATUS_ICON: Record<string, { icon: string; col: string }> = {
  ok: { icon: "✓", col: "text-emerald" },
  fail: { icon: "✕", col: "text-red-400" },
  pending: { icon: "◎", col: "text-cyan" },
  info: { icon: "·", col: "text-muted-foreground" },
};

const FILTERS: { id: EventCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "transfer", label: "Transfers" },
  { id: "payroll", label: "Payroll" },
  { id: "treasury", label: "Treasury" },
  { id: "counterparty", label: "Counterparties" },
  { id: "settings", label: "Settings" },
  { id: "system", label: "System" },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

function ActivityPage() {
  const [filter, setFilter] = useState<EventCategory>("all");

  const visible = filter === "all" ? EVENTS : EVENTS.filter((e) => e.category === filter);

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Activity</h1>
          </motion.div>

          {/* Filters */}
          <motion.div variants={item} className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const meta = CAT_META[f.id as string];
              return (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all",
                    filter === f.id ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-hairline bg-surface text-muted-foreground hover:border-foreground/20")}>
                  {meta && <div className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
                  {f.label}
                </button>
              );
            })}
          </motion.div>

          {/* Event log */}
          <motion.div variants={item} className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-hairline" />
            <div className="space-y-0">
              {visible.map((ev, i) => {
                const catMeta = CAT_META[ev.category];
                const statusIcon = STATUS_ICON[ev.status];
                return (
                  <motion.div key={ev.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="relative flex items-start gap-5 pb-5">
                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface">
                      <span className={`font-mono text-[12px] font-semibold ${statusIcon.col}`}>{statusIcon.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1.5">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider", catMeta.badge)}>
                          {catMeta.label}
                        </span>
                        <p className="text-[13px] font-medium text-foreground">{ev.event}</p>
                      </div>
                      <p className="text-[12px] text-muted-foreground">{ev.detail}</p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground/50">{ev.ts}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/40">· {ev.operator}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/30">· {ev.id}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {visible.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-[13px]">No events in this category</div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function ActivityWrapper() {
  return <AppShell><ActivityPage /></AppShell>;
}

export default ActivityWrapper;
