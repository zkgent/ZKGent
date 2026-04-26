import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { api, type DashboardStats } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

const ACTIONS = [
  { href: "/transfers", label: "New Confidential Transfer", desc: "Initiate a ZK-shielded payment", dot: "bg-emerald" },
  { href: "/payroll", label: "Create Payroll Batch", desc: "Disburse confidential salaries", dot: "bg-cyan" },
  { href: "/treasury", label: "Configure Treasury Route", desc: "Set up shielded routing policy", dot: "bg-violet" },
  { href: "/counterparties", label: "Add Counterparty", desc: "Onboard a new payment partner", dot: "bg-emerald/60" },
  { href: "/activity", label: "Review Activity", desc: "Inspect operational event log", dot: "bg-muted-foreground/40" },
];

const CAT_COLORS: Record<string, string> = {
  transfer: "text-emerald bg-emerald/10 border-emerald/20",
  payroll: "text-cyan bg-cyan/10 border-cyan/20",
  treasury: "text-violet bg-violet/10 border-violet/20",
  counterparty: "text-foreground bg-surface-elevated border-hairline",
  settings: "text-muted-foreground bg-surface border-hairline",
  system: "text-muted-foreground/60 bg-surface border-hairline",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard.get()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-8">

        <motion.div variants={item} className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Workspace</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />Privacy Active
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />Solana Devnet
            </span>
          </div>
        </motion.div>

        {loading ? (
          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border border-hairline bg-surface animate-pulse" />)}
          </motion.div>
        ) : error ? (
          <motion.div variants={item} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
            Failed to load: {error}
          </motion.div>
        ) : stats ? (
          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Transfers", value: stats.transfers.total, sub: `${stats.transfers.pending} pending`, dot: "bg-cyan" },
              { label: "Payroll Batches", value: stats.payroll.total, sub: `${stats.payroll.draft} draft`, dot: "bg-emerald" },
              { label: "Treasury Routes", value: stats.treasury.total, sub: "configured", dot: "bg-violet" },
              { label: "Counterparties", value: stats.counterparties.total, sub: `${stats.counterparties.verified} verified`, dot: "bg-emerald/60" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{s.label}</p>
                  <p className="text-[20px] font-semibold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground/50">{s.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        ) : null}

        <motion.div variants={item}>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Quick Actions</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIONS.map((a) => (
              <Link key={a.href} to={a.href}
                className="group flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-4 hover:border-foreground/20 hover:bg-surface-elevated transition-all">
                <div className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                </div>
                <span className="text-muted-foreground/30 group-hover:text-foreground/60 transition-colors">→</span>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Recent Activity</p>
            <Link to="/activity" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-foreground transition">View all →</Link>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface divide-y divide-hairline overflow-hidden">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-surface-elevated shrink-0" />
                  <div className="h-3 w-2/3 rounded bg-surface-elevated" />
                </div>
              ))
            ) : !stats || stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-[13px] text-muted-foreground">No activity yet</p>
                <p className="text-[11px] text-muted-foreground/50">Actions you take will appear here</p>
              </div>
            ) : (
              stats.recentActivity.map((ev) => {
                const catCls = CAT_COLORS[ev.category] ?? CAT_COLORS.system;
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition-colors">
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${catCls}`}>
                      {ev.category}
                    </span>
                    <p className="flex-1 min-w-0 text-[12px] text-foreground truncate">{ev.event}{ev.detail ? ` · ${ev.detail}` : ""}</p>
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
