import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { api, type TreasuryRoute } from "@/lib/api";

export const Route = createFileRoute("/treasury")({
  component: TreasuryWrapper,
});

const STATE_META: Record<string, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-emerald", text: "text-emerald" },
  idle: { label: "Idle", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  paused: { label: "Paused", dot: "bg-yellow-500/70", text: "text-yellow-400" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

const COLORS = ["bg-emerald/70", "bg-cyan/60", "bg-violet/60", "bg-yellow-500/40", "bg-muted-foreground/30"];

function AddRouteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: TreasuryRoute) => void }) {
  const [form, setForm] = useState({ name: "", source: "", destination: "", policy: "", status: "idle" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const r = await api.treasury.create(form as Parameters<typeof api.treasury.create>[0]);
      onCreated(r);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Add Treasury Route</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
        {err && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-400">{err}</p>}
        <div className="space-y-3">
          {[
            { k: "name", l: "Route name", p: "e.g. Ops Reserve" },
            { k: "source", l: "Source pool", p: "e.g. Primary USDC" },
            { k: "destination", l: "Destination pool", p: "e.g. Shielded Pool A" },
            { k: "policy", l: "Routing policy", p: "e.g. Auto-rebalance" },
          ].map(({ k, l, p }) => (
            <div key={k}>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</label>
              <input value={form[k as keyof typeof form]} onChange={(e) => set(k, e.target.value)} placeholder={p}
                className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
            </div>
          ))}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Initial state</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}
              className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                <option value="idle">Idle</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-50">
            {saving ? "Adding…" : "Add Route"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TreasuryPage() {
  const [routes, setRoutes] = useState<TreasuryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.treasury.list()
      .then(setRoutes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const active = routes.filter((r) => r.status === "active").length;
  const idle = routes.filter((r) => r.status === "idle").length;
  const paused = routes.filter((r) => r.status === "paused").length;

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Treasury</h1>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="group relative shrink-0 inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Add Route</span>
            </button>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Routes", value: loading ? "—" : routes.length, dot: "bg-foreground/40" },
              { label: "Active", value: loading ? "—" : active, dot: "bg-emerald" },
              { label: "Idle", value: loading ? "—" : idle, dot: "bg-muted-foreground/40" },
              { label: "Paused", value: loading ? "—" : paused, dot: "bg-yellow-500/70" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{s.label}</p>
                  <p className="text-[20px] font-semibold text-foreground">{s.value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">{error}</div>}

          <motion.div variants={item}>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Treasury Routes</p>
            <div className="rounded-2xl border border-hairline overflow-hidden">
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="p-5 border-b border-hairline animate-pulse"><div className="h-4 w-1/2 rounded bg-surface-elevated mb-2" /><div className="h-3 w-1/3 rounded bg-surface-elevated" /></div>)
              ) : routes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-2">
                  <p className="text-[13px] text-muted-foreground">No treasury routes configured</p>
                  <p className="text-[11px] text-muted-foreground/50">Add your first route using the button above</p>
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {routes.map((r, idx) => {
                    const meta = STATE_META[r.status] ?? STATE_META.idle;
                    const col = COLORS[idx % COLORS.length];
                    return (
                      <div key={r.id} className="p-5 hover:bg-surface-elevated transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${col}`} />
                              <p className="text-[14px] font-medium text-foreground">{r.name}</p>
                              <span className="font-mono text-[9px] text-muted-foreground/50">{r.id}</span>
                            </div>
                            <p className={`font-mono text-[10px] uppercase tracking-wider ${meta.text}`}>{meta.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                          {r.source && <span className="rounded bg-surface-elevated border border-hairline px-2 py-0.5 font-mono text-[10px]">{r.source}</span>}
                          {r.source && r.destination && <span className="text-muted-foreground/40">→</span>}
                          {r.destination && <span className="rounded bg-surface-elevated border border-hairline px-2 py-0.5 font-mono text-[10px]">{r.destination}</span>}
                          {r.policy && <span className="ml-2 text-muted-foreground/60">· {r.policy}</span>}
                        </div>
                        {r.lastMovedAt && (
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground/40">Last movement: {fmtDate(r.lastMovedAt)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
      {showAdd && (
        <AddRouteModal
          onClose={() => setShowAdd(false)}
          onCreated={(r) => { setRoutes((prev) => [r, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function TreasuryWrapper() {
  return <AppShell><TreasuryPage /></AppShell>;
}

export default TreasuryWrapper;
