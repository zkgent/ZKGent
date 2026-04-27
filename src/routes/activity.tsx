import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { api, type ActivityEvent } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

export const Route = createFileRoute("/activity")({
  component: ActivityWrapper,
});

type EventCategory = "all" | "transfer" | "payroll" | "treasury" | "counterparty" | "settings" | "system";

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ActivityPage() {
  const { wallet } = useWallet();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventCategory>("all");

  useEffect(() => {
    if (!wallet?.address) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.activity.list({ wallet: wallet.address })
      .then(setEvents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wallet?.address]);

  const visible = filter === "all" ? events : events.filter((e) => e.category === filter);

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Activity</h1>
          </motion.div>

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

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">{error}</div>}

          <motion.div variants={item} className="relative">
            {!loading && visible.length > 0 && (
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-hairline" />
            )}
            <div className="space-y-0">
              {loading ? (
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-5 pb-5 animate-pulse">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-surface-elevated" />
                    <div className="flex-1 pt-1.5 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-surface-elevated" />
                      <div className="h-2 w-2/3 rounded bg-surface-elevated" />
                    </div>
                  </div>
                ))
              ) : !wallet ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-[13px] text-muted-foreground">Connect a wallet to view activity</p>
                  <p className="text-[11px] text-muted-foreground/50">Activity is scoped per wallet — each wallet sees only its own events</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-[13px] text-muted-foreground">{events.length === 0 ? "No activity yet" : "No events in this category"}</p>
                  {events.length === 0 && <p className="text-[11px] text-muted-foreground/50">Actions across transfers, payroll, and treasury will appear here</p>}
                </div>
              ) : (
                visible.map((ev, i) => {
                  const catMeta = CAT_META[ev.category] ?? CAT_META.system;
                  const statusIcon = STATUS_ICON[ev.status] ?? STATUS_ICON.info;
                  return (
                    <motion.div key={ev.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
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
                        {ev.detail && <p className="text-[12px] text-muted-foreground">{ev.detail}</p>}
                        <div className="mt-1 flex items-center gap-3">
                          <span className="font-mono text-[10px] text-muted-foreground/50">{fmtDate(ev.createdAt)}</span>
                          <span className="font-mono text-[10px] text-muted-foreground/40">· {ev.operator}</span>
                          <span className="font-mono text-[10px] text-muted-foreground/30">· {ev.id}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
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
