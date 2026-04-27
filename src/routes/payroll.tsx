import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { api, type PayrollBatch } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

export const Route = createFileRoute("/payroll")({
  component: PayrollWrapper,
});

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  draft: { label: "Draft", dot: "bg-cyan", badge: "border-cyan/20 bg-cyan/8 text-cyan" },
  pending: { label: "Pending", dot: "bg-yellow-500/70", badge: "border-yellow-500/20 bg-yellow-500/8 text-yellow-400" },
  settled: { label: "Settled", dot: "bg-emerald/60", badge: "border-emerald/15 bg-emerald/5 text-emerald/70" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function CreateBatchModal({ walletAddress, onClose, onCreated }: { walletAddress: string; onClose: () => void; onCreated: (b: PayrollBatch) => void }) {
  const [form, setForm] = useState({ name: "", scheduledDate: "", asset: "USDC", recipientCount: "", approvalThreshold: "2", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErr("Batch name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const b = await api.payroll.create({
        name: form.name,
        scheduledDate: form.scheduledDate || undefined,
        asset: form.asset,
        recipientCount: form.recipientCount ? parseInt(form.recipientCount) : 0,
        approvalThreshold: parseInt(form.approvalThreshold),
        notes: form.notes,
        walletAddress,
      } as Parameters<typeof api.payroll.create>[0]);
      onCreated(b);
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
          <h2 className="font-display text-lg font-semibold text-foreground">Create Payroll Batch</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
        {err && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-400">{err}</p>}
        <div className="space-y-3">
          {[
            { k: "name", l: "Batch name", p: "e.g. Engineering Q3 2024", type: "text" },
            { k: "scheduledDate", l: "Scheduled date", p: "Disbursement date", type: "date" },
            { k: "recipientCount", l: "Recipient count", p: "Number of recipients", type: "number" },
            { k: "approvalThreshold", l: "Approval threshold", p: "Required signers", type: "number" },
          ].map(({ k, l, p, type }) => (
            <div key={k}>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</label>
              <input type={type} value={form[k as keyof typeof form]} onChange={(e) => set(k, e.target.value)} placeholder={p}
                className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
            </div>
          ))}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Asset</label>
            <select value={form.asset} onChange={(e) => set("asset", e.target.value)}
              className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
              <option value="USDC">USDC</option>
              <option value="SOL">SOL</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-50">
            {saving ? "Creating…" : "Create Draft"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PayrollPage() {
  const { wallet } = useWallet();
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!wallet?.address) {
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.payroll.list(wallet.address)
      .then(setBatches)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wallet?.address]);

  const total = batches.reduce((s, b) => s + b.recipientCount, 0);
  const drafts = batches.filter((b) => b.status === "draft");
  const nextDraft = drafts.sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""))[0];

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Payroll</h1>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!wallet?.address}
              title={wallet?.address ? "" : "Connect a wallet to create a payroll batch"}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2 text-[12px] font-medium text-background transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Create Batch</span>
            </button>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Total Batches", value: batches.length, sub: `${drafts.length} draft` },
              { label: "Total Recipients", value: total, sub: "across all batches" },
              { label: "Next Run", value: nextDraft?.scheduledDate ? fmtDate(nextDraft.scheduledDate) : "—", sub: nextDraft?.name ?? "No pending batches" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-hairline bg-surface px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{s.label}</p>
                <p className="mt-1 text-[20px] font-semibold text-foreground">{loading ? "—" : s.value}</p>
                <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
              </div>
            ))}
          </motion.div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">{error}</div>}

          <motion.div variants={item}>
            <div className="rounded-2xl border border-hairline overflow-hidden">
              <div className="border-b border-hairline bg-surface-elevated px-5 py-2.5 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
                {["Batch", "Recipients", "Scheduled", "Status", "Approvals"].map((h) => (
                  <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-hairline">
                {loading ? (
                  [0, 1, 2].map((i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 animate-pulse">
                      <div className="h-3 w-2/3 rounded bg-surface-elevated" />
                      <div className="h-3 w-8 rounded bg-surface-elevated" />
                      <div className="h-3 w-16 rounded bg-surface-elevated" />
                      <div className="h-5 w-14 rounded-full bg-surface-elevated" />
                      <div className="h-3 w-8 rounded bg-surface-elevated" />
                    </div>
                  ))
                ) : !wallet ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-2">
                    <p className="text-[13px] text-muted-foreground">Connect a wallet to view payroll batches</p>
                    <p className="text-[11px] text-muted-foreground/50">Batches are scoped per wallet — each wallet sees only its own batches</p>
                  </div>
                ) : batches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-2">
                    <p className="text-[13px] text-muted-foreground">No payroll batches yet</p>
                    <p className="text-[11px] text-muted-foreground/50">Create your first batch using the button above</p>
                  </div>
                ) : (
                  batches.map((b) => {
                    const meta = STATUS_META[b.status] ?? STATUS_META.draft;
                    return (
                      <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-surface-elevated transition-colors cursor-default">
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{b.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground/60">{b.id}</p>
                        </div>
                        <span className="font-mono text-[12px] text-foreground text-center">{b.recipientCount}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{b.scheduledDate ? fmtDate(b.scheduledDate) : "—"}</span>
                        <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1", meta.badge)}>
                          <div className={`h-1 w-1 rounded-full ${meta.dot}`} />
                          <span className="font-mono text-[9px] uppercase tracking-wider">{meta.label}</span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground text-center">{b.approvals} / {b.approvalThreshold}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      {showCreate && wallet?.address && (
        <CreateBatchModal
          walletAddress={wallet.address}
          onClose={() => setShowCreate(false)}
          onCreated={(b) => { setBatches((prev) => [b, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function PayrollWrapper() {
  return <AppShell><PayrollPage /></AppShell>;
}

export default PayrollWrapper;
