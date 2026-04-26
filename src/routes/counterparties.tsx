import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/counterparties")({
  component: CounterpartiesWrapper,
});

const COUNTERPARTIES = [
  {
    id: "CP-001",
    name: "Vertex Capital Partners",
    type: "Institutional",
    region: "North America",
    status: "verified",
    relationship: "Vendor",
    added: "Apr 24",
    lastActivity: "Apr 26",
  },
  {
    id: "CP-002",
    name: "Arcane Digital AG",
    type: "Institutional",
    region: "Europe",
    status: "verified",
    relationship: "Partner",
    added: "Mar 10",
    lastActivity: "Apr 20",
  },
  {
    id: "CP-003",
    name: "Meridian Treasury Corp",
    type: "Corporate",
    region: "Asia-Pacific",
    status: "verified",
    relationship: "Payee",
    added: "Feb 5",
    lastActivity: "Apr 15",
  },
  {
    id: "CP-004",
    name: "Lux Infrastructure SA",
    type: "Corporate",
    region: "Europe",
    status: "pending_kyc",
    relationship: "Vendor",
    added: "Apr 22",
    lastActivity: null,
  },
  {
    id: "CP-005",
    name: "Solaris Ops LLC",
    type: "Operator",
    region: "North America",
    status: "pending_kyc",
    relationship: "Service",
    added: "Apr 18",
    lastActivity: null,
  },
  {
    id: "CP-006",
    name: "Horizon Remit Ltd",
    type: "Remittance",
    region: "Latin America",
    status: "not_connected",
    relationship: "Recipient",
    added: "Apr 26",
    lastActivity: null,
  },
  {
    id: "CP-007",
    name: "Noor Financial MENA",
    type: "Institutional",
    region: "Middle East & Africa",
    status: "verified",
    relationship: "Partner",
    added: "Jan 30",
    lastActivity: "Apr 10",
  },
];

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

function AddCounterpartyModal({ onClose }: { onClose: () => void }) {
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
        <div className="space-y-3">
          {[
            { l: "Legal name", p: "Counterparty's registered name" },
            { l: "Contact email", p: "Primary contact for KYC" },
            { l: "Wallet address", p: "Solana address (optional)" },
          ].map(({ l, p }) => (
            <div key={l}>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</label>
              <input placeholder={p} className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald/50" />
            </div>
          ))}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Type</label>
            <select className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
              {["Institutional", "Corporate", "Operator", "Remittance"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Relationship</label>
            <select className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-emerald/50 appearance-none">
              {["Vendor", "Partner", "Payee", "Recipient", "Service"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">Cancel</button>
          <button className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition">Add & Invite to KYC</button>
        </div>
      </motion.div>
    </div>
  );
}

function CounterpartiesPage() {
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const visible = COUNTERPARTIES
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.region.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Counterparties</h1>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="group relative shrink-0 inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">+ Add Counterparty</span>
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-3 gap-3">
            {[
              { label: "Verified", value: "4", dot: "bg-emerald" },
              { label: "KYC Pending", value: "2", dot: "bg-cyan" },
              { label: "Not Connected", value: "1", dot: "bg-muted-foreground/40" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{s.label}</p>
                  <p className="text-[15px] font-semibold text-foreground">{s.value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Search + filters */}
          <motion.div variants={item} className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or region…"
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

          {/* Table */}
          <motion.div variants={item} className="rounded-2xl border border-hairline overflow-hidden">
            <div className="border-b border-hairline bg-surface-elevated px-5 py-2.5 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
              {["Name", "Type", "Region", "Relationship", "Status"].map((h) => (
                <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-hairline">
              {visible.map((c) => {
                const meta = STATUS_META[c.status];
                return (
                  <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-surface-elevated transition-colors cursor-default">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground/50">{c.id} · Added {c.added}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{c.type}</span>
                    <span className="text-[11px] text-muted-foreground">{c.region}</span>
                    <span className="rounded-full border border-hairline bg-surface-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.relationship}</span>
                    <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1", meta.badge)}>
                      <div className={`h-1 w-1 rounded-full ${meta.dot}`} />
                      <span className="font-mono text-[9px] uppercase tracking-wider">{meta.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {visible.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-[13px]">No counterparties found</div>
            )}
          </motion.div>
        </motion.div>
      </div>
      {showAdd && <AddCounterpartyModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function CounterpartiesWrapper() {
  return <AppShell><CounterpartiesPage /></AppShell>;
}

export default CounterpartiesWrapper;
