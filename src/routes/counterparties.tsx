import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { api, type Counterparty } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

export const Route = createFileRoute("/counterparties")({
  component: CounterpartiesWrapper,
});

const STATUS_META: Record<string, { label: string; dot: string; text: string; badge: string }> = {
  verified: { label: "Verified", dot: "bg-emerald", text: "text-emerald", badge: "border-emerald/20 bg-emerald/8 text-emerald" },
  pending_kyc: { label: "KYC Pending", dot: "bg-cyan animate-pulse", text: "text-cyan", badge: "border-cyan/20 bg-cyan/8 text-cyan" },
  not_connected: { label: "Not Connected", dot: "bg-muted-foreground/40", text: "text-muted-foreground", badge: "border-hairline bg-surface text-muted-foreground" },
};

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "verified", label: "Verified" },
  { id: "pending_kyc", label: "Pending KYC" },
  { id: "not_connected", label: "Not Connected" },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AddCounterpartyModal({ createdByWallet, onClose, onCreated }: { createdByWallet: string; onClose: () => void; onCreated: (c: Counterparty) => void }) {
  const [form, setForm] = useState({ name: "", type: "Institutional", relationship: "Vendor", region: "", contactEmail: "", walletAddress: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const c = await api.counterparties.create({ ...form, createdByWallet } as Parameters<typeof api.counterparties.create>[0]);
      onCreated(c);
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
          <h2 className="font-display text-lg font-semibold text-foreground">Add Counterparty</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
        {err && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-400">{err}</p>}
        <div className="space-y-3">
          {[
            { k: "name", l: "Legal name", p: "Counterparty's registered name" },
            { k: "contactEmail", l: "Contact email", p: "Primary contact for KYC" },
            { k: "walletAddress", l: "Wallet address", p: "Solana address (optional)" },
            { k: "region", l: "Region", p: "e.g. North America" },
          ].map(({ k, l, p }) => (
            <div key={k}>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</label>
              <input value={form[k as keyof typeof form]} onChange={(e) => set(k, e.target.value)} placeholder={p}
                className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
            </div>
          ))}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}
              className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
              {["Institutional", "Corporate", "Operator", "Remittance"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Relationship</label>
            <select value={form.relationship} onChange={(e) => set("relationship", e.target.value)}
              className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
              {["Vendor", "Partner", "Payee", "Recipient", "Service"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-50">
            {saving ? "Adding…" : "Add & Invite to KYC"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CounterpartiesPage() {
  const { wallet } = useWallet();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!wallet?.address) {
      setCounterparties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.counterparties.list(wallet.address)
      .then(setCounterparties)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wallet?.address]);

  const verified = counterparties.filter((c) => c.status === "verified").length;
  const pending = counterparties.filter((c) => c.status === "pending_kyc").length;
  const notConnected = counterparties.filter((c) => c.status === "not_connected").length;

  const visible = counterparties
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.region ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Counterparties</h1>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              disabled={!wallet?.address}
              title={wallet?.address ? "" : "Connect a wallet to add a counterparty"}
              className="group relative shrink-0 inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">+ Add Counterparty</span>
            </button>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-3 gap-3">
            {[
              { label: "Verified", value: loading ? "—" : verified, dot: "bg-emerald" },
              { label: "KYC Pending", value: loading ? "—" : pending, dot: "bg-cyan" },
              { label: "Not Connected", value: loading ? "—" : notConnected, dot: "bg-muted-foreground/40" },
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

          <motion.div variants={item} className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or region…"
                className="w-full rounded-lg border border-hairline bg-surface pl-8 pr-4 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
            </div>
            <div className="flex gap-2">
              {FILTER_OPTIONS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={cn("rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all",
                    filter === f.id ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-hairline bg-surface text-muted-foreground hover:border-foreground/20")}>
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">{error}</div>}

          <motion.div variants={item} className="rounded-2xl border border-hairline overflow-hidden">
            <div className="border-b border-hairline bg-surface-elevated px-5 py-2.5 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
              {["Name", "Type", "Region", "Relationship", "Status"].map((h) => (
                <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-hairline">
              {loading ? (
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 animate-pulse">
                    <div className="h-3 w-1/2 rounded bg-surface-elevated" />
                    <div className="h-3 w-16 rounded bg-surface-elevated" />
                    <div className="h-3 w-20 rounded bg-surface-elevated" />
                    <div className="h-5 w-12 rounded-full bg-surface-elevated" />
                    <div className="h-5 w-16 rounded-full bg-surface-elevated" />
                  </div>
                ))
              ) : !wallet ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-[13px] text-muted-foreground">Connect a wallet to view counterparties</p>
                  <p className="text-[11px] text-muted-foreground/50">Counterparties are scoped per wallet — each wallet sees only its own list</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-[13px] text-muted-foreground">{counterparties.length === 0 ? "No counterparties yet" : "No matches"}</p>
                  {counterparties.length === 0 && <p className="text-[11px] text-muted-foreground/50">Add your first counterparty above</p>}
                </div>
              ) : (
                visible.map((c) => {
                  const meta = STATUS_META[c.status] ?? STATUS_META.not_connected;
                  return (
                    <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-surface-elevated transition-colors cursor-default">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground/50">{c.id} · Added {fmtDate(c.createdAt)}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{c.type}</span>
                      <span className="text-[11px] text-muted-foreground">{c.region || "—"}</span>
                      <span className="rounded-full border border-hairline bg-surface-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.relationship}</span>
                      <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1", meta.badge)}>
                        <div className={`h-1 w-1 rounded-full ${meta.dot}`} />
                        <span className="font-mono text-[9px] uppercase tracking-wider">{meta.label}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
      {showAdd && wallet?.address && (
        <AddCounterpartyModal
          createdByWallet={wallet.address}
          onClose={() => setShowAdd(false)}
          onCreated={(c) => { setCounterparties((prev) => [c, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function CounterpartiesWrapper() {
  return <AppShell><CounterpartiesPage /></AppShell>;
}

export default CounterpartiesWrapper;
