import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/treasury")({
  component: TreasuryWrapper,
});

const ROUTES = [
  {
    id: "TR-OPS-001",
    name: "Ops Reserve",
    from: "Primary USDC",
    to: "Shielded Pool A",
    policy: "Auto-rebalance",
    state: "active",
    allocated: "40%",
    lastMoved: "Apr 24 · 09:01",
  },
  {
    id: "TR-PAYROLL-002",
    name: "Payroll Buffer",
    from: "Shielded Pool A",
    to: "Payroll Execution",
    policy: "Scheduled · Monthly",
    state: "active",
    allocated: "30%",
    lastMoved: "Apr 1 · 16:00",
  },
  {
    id: "TR-EMERGENCY-003",
    name: "Emergency Reserve",
    from: "Primary USDC",
    to: "Cold Storage",
    policy: "Manual only",
    state: "idle",
    allocated: "20%",
    lastMoved: "Jan 15 · 11:30",
  },
  {
    id: "TR-VENDOR-004",
    name: "Vendor Disbursement",
    from: "Shielded Pool B",
    to: "Counterparty Settlement",
    policy: "Approval required",
    state: "pending_setup",
    allocated: "10%",
    lastMoved: null,
  },
];

const APPROVALS = [
  { id: "APR-001", route: "Ops Reserve rebalance", amount: "$[hidden]", requestedBy: "operator@obsidian", age: "2h ago", state: "pending" },
  { id: "APR-002", route: "Vendor disbursement to Vertex Capital", amount: "$[hidden]", requestedBy: "operator@obsidian", age: "6h ago", state: "pending" },
];

const STATE_META: Record<string, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-emerald", text: "text-emerald" },
  idle: { label: "Idle", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  pending_setup: { label: "Setup required", dot: "bg-yellow-500/70", text: "text-yellow-400" },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function TreasuryPage() {
  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Operations</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Treasury</h1>
            </div>
            <button className="group relative shrink-0 inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Add Route</span>
            </button>
          </motion.div>

          {/* Summary */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Active Routes", value: "2", dot: "bg-emerald" },
              { label: "Idle Routes", value: "1", dot: "bg-muted-foreground/40" },
              { label: "Pending Setup", value: "1", dot: "bg-yellow-500/70" },
              { label: "Pending Approvals", value: "2", dot: "bg-cyan" },
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

          {/* Allocation visual */}
          <motion.div variants={item} className="rounded-2xl border border-hairline bg-surface p-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Treasury Allocation</p>
            <div className="flex h-4 overflow-hidden rounded-full gap-px">
              <div className="h-full bg-emerald/70" style={{ width: "40%" }} />
              <div className="h-full bg-cyan/60" style={{ width: "30%" }} />
              <div className="h-full bg-muted-foreground/30" style={{ width: "20%" }} />
              <div className="h-full bg-yellow-500/40" style={{ width: "10%" }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {[
                { label: "Ops Reserve", pct: "40%", col: "bg-emerald/70" },
                { label: "Payroll Buffer", pct: "30%", col: "bg-cyan/60" },
                { label: "Emergency Reserve", pct: "20%", col: "bg-muted-foreground/30" },
                { label: "Vendor", pct: "10%", col: "bg-yellow-500/40" },
              ].map((a) => (
                <div key={a.label} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-sm ${a.col}`} />
                  <span className="text-[11px] text-muted-foreground">{a.label}</span>
                  <span className="font-mono text-[11px] text-foreground">{a.pct}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Routes */}
          <motion.div variants={item}>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Treasury Routes</p>
            <div className="rounded-2xl border border-hairline overflow-hidden">
              <div className="divide-y divide-hairline">
                {ROUTES.map((r) => {
                  const meta = STATE_META[r.state];
                  return (
                    <div key={r.id} className="p-5 hover:bg-surface-elevated transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                            <p className="text-[14px] font-medium text-foreground">{r.name}</p>
                            <span className="font-mono text-[9px] text-muted-foreground/50">{r.id}</span>
                          </div>
                          <p className={`font-mono text-[10px] uppercase tracking-wider ${meta.text}`}>{meta.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-foreground">{r.allocated}</p>
                          <p className="font-mono text-[9px] text-muted-foreground/50">allocated</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded bg-surface-elevated border border-hairline px-2 py-0.5 font-mono text-[10px]">{r.from}</span>
                        <span className="text-muted-foreground/40">→</span>
                        <span className="rounded bg-surface-elevated border border-hairline px-2 py-0.5 font-mono text-[10px]">{r.to}</span>
                        <span className="ml-2 text-muted-foreground/60">· {r.policy}</span>
                      </div>
                      {r.lastMoved && (
                        <p className="mt-2 font-mono text-[10px] text-muted-foreground/40">Last movement: {r.lastMoved}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Pending approvals */}
          {APPROVALS.length > 0 && (
            <motion.div variants={item}>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Pending Approvals</p>
              <div className="space-y-2">
                {APPROVALS.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-5 py-4">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{a.route}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground/60">{a.requestedBy}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/40">· {a.age}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="rounded-full border border-hairline px-3.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition">Reject</button>
                      <button className="rounded-full border border-emerald/30 bg-emerald/10 px-3.5 py-1.5 text-[12px] text-emerald hover:bg-emerald/15 transition">Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function TreasuryWrapper() {
  return <AppShell><TreasuryPage /></AppShell>;
}

export default TreasuryWrapper;
