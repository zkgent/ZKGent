import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/applications")({
  component: AdminApplicationsPage,
});

const ADMIN_KEY_STORAGE = "zkgent_admin_key";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "under_review", label: "Under Review" },
  { value: "qualified", label: "Qualified" },
  { value: "pilot_candidate", label: "Pilot Candidate" },
  { value: "contacted", label: "Contacted" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  under_review: { label: "Under Review", dot: "bg-cyan", text: "text-cyan" },
  qualified: { label: "Qualified", dot: "bg-emerald", text: "text-emerald" },
  pilot_candidate: { label: "Pilot Candidate", dot: "bg-emerald", text: "text-emerald" },
  contacted: { label: "Contacted", dot: "bg-violet", text: "text-violet" },
  rejected: { label: "Rejected", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "normal", label: "Normal", color: "text-foreground" },
  { value: "high", label: "High", color: "text-violet" },
];

const USE_CASE_LABELS: Record<string, string> = {
  payroll: "Private Payroll",
  treasury: "Treasury Operations",
  merchant: "Merchant Payments",
  remittance: "Remittance",
  transfers: "High-Sensitivity Transfers",
};

type Application = {
  id: string;
  fullName: string;
  workEmail: string;
  company: string;
  role: string;
  useCase: string;
  teamSize: string;
  region: string;
  monthlyVolume: string;
  currentRail: string;
  privacyConcern: string;
  whyConfidential: string;
  status: string;
  internalNotes: string;
  reviewPriority: string;
  tags: string;
  contactedAt: string | null;
  walletAddress: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Meta = { total: number; byStatus: { status: string; count: number }[] };

function AdminLogin({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);

  const attempt = async () => {
    setError(false);
    const res = await fetch("/api/admin/applications?limit=1", {
      headers: { "x-admin-key": key },
    });
    if (res.ok) { onLogin(key); }
    else { setError(true); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-emerald/[0.04] blur-[120px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-surface">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="8" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6 8V5.5a3 3 0 016 0V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="9" cy="12" r="1" fill="currentColor" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">Admin Access</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">ZKGENT Internal</p>
        </div>
        <div className="space-y-3">
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && attempt()}
            placeholder="Admin key"
            className={cn("w-full rounded-lg border bg-surface px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all",
              error ? "border-destructive/60 focus:border-destructive" : "border-hairline focus:border-emerald/50 focus:ring-1 focus:ring-emerald/20")} />
          {error && <p className="text-[12px] text-destructive">Invalid admin key.</p>}
          <button onClick={attempt}
            className="group relative w-full overflow-hidden rounded-full bg-foreground px-6 py-3 text-[13px] font-medium text-background transition-all hover:shadow-[0_0_30px_-8px_rgba(255,255,255,0.4)]">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Continue →</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailPanel({ app, adminKey, onUpdate, onClose }: {
  app: Application; adminKey: string;
  onUpdate: (updated: Application) => void; onClose: () => void;
}) {
  const [notes, setNotes] = useState(app.internalNotes || "");
  const [status, setStatus] = useState(app.status);
  const [priority, setPriority] = useState(app.reviewPriority);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ status, internalNotes: notes, reviewPriority: priority }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const s = STATUS_META[status] || STATUS_META.under_review;

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-hairline bg-surface overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{app.id}</p>
          <p className="text-[15px] font-semibold text-foreground">{app.fullName}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-6">
        <div className="space-y-1.5">
          {[
            { l: "Email", v: app.workEmail },
            { l: "Company", v: app.company },
            { l: "Role", v: app.role },
            { l: "Use Case", v: USE_CASE_LABELS[app.useCase] || app.useCase },
            { l: "Team Size", v: app.teamSize },
            { l: "Region", v: app.region },
            { l: "Monthly Volume", v: app.monthlyVolume },
            { l: "Current Rail", v: app.currentRail },
            { l: "Privacy Concern", v: app.privacyConcern },
          ].map(({ l, v }) => (
            <div key={l} className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 shrink-0">{l}</span>
              <span className="text-[12px] text-foreground text-right ml-4">{v}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-hairline bg-background p-3 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Wallet & Access</p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">Linked wallet</span>
            <span className="text-[11px] text-foreground font-mono">
              {app.walletAddress ? `${app.walletAddress.slice(0, 8)}…${app.walletAddress.slice(-6)}` : "— not linked —"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">Approved at</span>
            <span className="text-[11px] text-foreground">
              {app.approvedAt ? new Date(app.approvedAt).toLocaleString() : "— pending —"}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Why confidential payments</p>
          <p className="text-[12px] leading-relaxed text-foreground rounded-lg border border-hairline bg-background p-3">{app.whyConfidential}</p>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUS_OPTIONS.slice(1).map((opt) => {
              const m = STATUS_META[opt.value];
              return (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[11px] font-medium transition-all",
                    status === opt.value ? "border-emerald/40 bg-emerald/8 text-foreground" : "border-hairline bg-background text-muted-foreground hover:border-foreground/20")}>
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Priority</p>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setPriority(opt.value)}
                className={cn("flex-1 rounded-lg border px-3 py-2 text-[11px] font-medium transition-all",
                  priority === opt.value ? "border-emerald/40 bg-emerald/8 text-foreground" : "border-hairline bg-background text-muted-foreground hover:border-foreground/20")}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Internal Notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            placeholder="Add review notes…"
            className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50 focus:ring-1 focus:ring-emerald/20 resize-none" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition hover:opacity-90 disabled:opacity-60">
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>

        <p className="font-mono text-[10px] text-muted-foreground/40 text-center">
          Applied {new Date(app.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          {app.contactedAt && ` · Contacted ${new Date(app.contactedAt).toLocaleDateString()}`}
        </p>
      </div>
    </motion.div>
  );
}

function AdminApplicationsPage() {
  const [adminKey, setAdminKey] = useState<string | null>(() => localStorage.getItem(ADMIN_KEY_STORAGE));
  const [applications, setApplications] = useState<Application[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);

  const fetchApps = useCallback(async (key: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    try {
      const res = await fetch(`/api/admin/applications?${params}`, { headers: { "x-admin-key": key } });
      if (!res.ok) { setAdminKey(null); localStorage.removeItem(ADMIN_KEY_STORAGE); return; }
      const data = await res.json();
      setApplications(data.applications);
      setMeta(data.meta);
    } catch {}
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => {
    if (adminKey) fetchApps(adminKey);
    else setLoading(false);
  }, [adminKey, fetchApps]);

  const handleLogin = (key: string) => {
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setAdminKey(key);
  };

  const handleUpdate = (updated: Application) => {
    setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    setSelected(updated);
  };

  if (!adminKey) return <AdminLogin onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[300px] w-[400px] rounded-full bg-emerald/[0.03] blur-[120px]" />
      </div>

      <div className="border-b border-hairline bg-surface/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ZKGent" className="h-7 w-7 shrink-0 rounded-md" />
          <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-foreground">ZKGENT</span>
          <span className="font-mono text-[10px] text-muted-foreground/60">/ Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {meta && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {meta.total} application{meta.total !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => { setAdminKey(null); localStorage.removeItem(ADMIN_KEY_STORAGE); }}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition">
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company…"
              className="w-full rounded-lg border border-hairline bg-surface pl-9 pr-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none min-w-[150px]">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => adminKey && fetchApps(adminKey)}
            className="rounded-lg border border-hairline bg-surface px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">
            Refresh
          </button>
        </div>

        {meta && (
          <div className="mb-6 flex flex-wrap gap-2">
            {meta.byStatus.map(({ status, count }) => {
              const m = STATUS_META[status];
              if (!m) return null;
              return (
                <button key={status} onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                    statusFilter === status ? "border-emerald/40 bg-emerald/8 text-emerald" : "border-hairline bg-surface text-muted-foreground hover:border-foreground/20")}>
                  <div className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  {m.label} · {count}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-emerald" />
            <span className="font-mono text-[12px] uppercase tracking-wider">Loading…</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <p className="text-muted-foreground text-[14px]">No applications found.</p>
            {(statusFilter || search) && (
              <button onClick={() => { setStatusFilter(""); setSearch(""); }}
                className="font-mono text-[11px] uppercase tracking-wider text-emerald/80 hover:text-emerald">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline">
            <table className="w-full">
              <thead className="border-b border-hairline bg-surface-elevated">
                <tr>
                  {["Name", "Company", "Use Case", "Volume", "Status", "Wallet", "Applied"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => {
                  const s = STATUS_META[app.status] || STATUS_META.under_review;
                  const priority = PRIORITY_OPTIONS.find((p) => p.value === app.reviewPriority);
                  return (
                    <tr key={app.id} onClick={() => setSelected(app)}
                      className={cn("border-b border-hairline last:border-0 cursor-pointer transition-colors",
                        selected?.id === app.id ? "bg-emerald/5" : "hover:bg-surface-elevated")}>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-foreground">{app.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">{app.workEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[12px] text-foreground">{app.company}</p>
                        <p className="text-[11px] text-muted-foreground">{app.role}</p>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{USE_CASE_LABELS[app.useCase] || app.useCase}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{app.monthlyVolume}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          <span className={`font-mono text-[10px] uppercase tracking-wider ${s.text}`}>{s.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {app.walletAddress ? (
                          <span className="font-mono text-[10px] text-foreground">
                            {app.walletAddress.slice(0, 4)}…{app.walletAddress.slice(-4)}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
              onClick={() => setSelected(null)} />
            <DetailPanel app={selected} adminKey={adminKey}
              onUpdate={handleUpdate} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminApplicationsPage;
