import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

const ACTIONS = [
  { href: "/transfers", label: "New Confidential Transfer", desc: "Initiate a ZK-shielded payment", dot: "bg-emerald", arrow: true },
  { href: "/payroll", label: "Run Payroll Batch", desc: "Disburse confidential salaries", dot: "bg-cyan", arrow: true },
  { href: "/treasury", label: "Review Treasury Flows", desc: "Manage shielded routing policies", dot: "bg-violet", arrow: true },
  { href: "/counterparties", label: "Add Counterparty", desc: "Onboard a new payment partner", dot: "bg-emerald/60", arrow: true },
  { href: "/activity", label: "Inspect Activity", desc: "Audit operational event log", dot: "bg-muted-foreground/40", arrow: true },
];

const READINESS = [
  { label: "Solana wallet", status: "Connected", state: "ok" },
  { label: "Privacy mode", status: "Active", state: "ok" },
  { label: "ZK proof engine", status: "In Setup", state: "pending" },
  { label: "Treasury policy", status: "Not Configured", state: "warn" },
  { label: "Payroll recipients", status: "0 imported", state: "warn" },
  { label: "Disclosure policy", status: "Default", state: "ok" },
  { label: "Counterparty KYC", status: "Not Connected", state: "warn" },
];

const ACTIVITY = [
  { id: "EVT-001", event: "Transfer initiated", detail: "OBD-T-2847 · $[hidden]", ts: "2m ago", cat: "transfer" },
  { id: "EVT-002", event: "Payroll draft created", detail: "Q2 Engineering batch · 24 recipients", ts: "18m ago", cat: "payroll" },
  { id: "EVT-003", event: "Treasury route updated", detail: "Ops Reserve → USDC shielded pool", ts: "1h ago", cat: "treasury" },
  { id: "EVT-004", event: "Counterparty added", detail: "Vertex Capital Partners · Verified", ts: "3h ago", cat: "counterparty" },
  { id: "EVT-005", event: "Disclosure policy set", detail: "Audit-only · Compliance key registered", ts: "6h ago", cat: "settings" },
];

const ARCH_NODES = [
  { label: "Confidential Notes", desc: "UTXO-style value commitments", state: "Pilot scope", dot: "bg-emerald" },
  { label: "ZK Proof Engine", desc: "Groth16 on-chain verification", state: "In setup", dot: "bg-cyan" },
  { label: "Settlement Layer", desc: "Sub-second Solana finality", state: "In setup", dot: "bg-violet" },
  { label: "Policy Controls", desc: "Selective disclosure + audit keys", state: "Planned", dot: "bg-muted-foreground/30" },
  { label: "Audit Surface", desc: "Compliant disclosure interface", state: "Planned", dot: "bg-muted-foreground/30" },
];

const CAT_COLORS: Record<string, string> = {
  transfer: "text-emerald bg-emerald/10 border-emerald/20",
  payroll: "text-cyan bg-cyan/10 border-cyan/20",
  treasury: "text-violet bg-violet/10 border-violet/20",
  counterparty: "text-foreground bg-surface-elevated border-hairline",
  settings: "text-muted-foreground bg-surface border-hairline",
};

function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      {sub && <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">{sub}</p>}
      <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-hairline bg-surface ${className}`}>{children}</div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">{children}</p>;
}

function StateIndicator({ state }: { state: "ok" | "pending" | "warn" }) {
  if (state === "ok") return <div className="h-1.5 w-1.5 rounded-full bg-emerald" />;
  if (state === "pending") return <div className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />;
  return <div className="h-1.5 w-1.5 rounded-full bg-yellow-500/80" />;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function DashboardPage() {
  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[360px] w-[500px] rounded-full bg-emerald/[0.04] blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[280px] w-[380px] rounded-full bg-violet/[0.03] blur-[120px]" />
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">Workspace</p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">Privacy active</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">Solana devnet</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status bar */}
        <motion.div variants={item}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Transfers", value: "3 pending", dot: "bg-cyan" },
              { label: "Payroll", value: "1 draft", dot: "bg-emerald" },
              { label: "Treasury routes", value: "2 active", dot: "bg-violet" },
              { label: "Counterparties", value: "7 onboarded", dot: "bg-emerald/60" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{s.label}</p>
                  <p className="text-[13px] font-medium text-foreground">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Primary actions — 2 cols */}
          <motion.div variants={item} className="lg:col-span-2">
            <SectionLabel>Quick Actions</SectionLabel>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {ACTIONS.map((a) => (
                <Link key={a.href} to={a.href}
                  className="group flex items-center gap-4 rounded-xl border border-hairline bg-surface px-4 py-4 transition-all hover:border-emerald/25 hover:bg-surface-elevated">
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground leading-none">{a.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{a.desc}</p>
                  </div>
                  <span className="text-muted-foreground/30 transition-all group-hover:text-emerald/70 group-hover:translate-x-0.5">→</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Readiness — 1 col */}
          <motion.div variants={item}>
            <SectionLabel>Configuration State</SectionLabel>
            <Card className="p-4">
              <div className="space-y-0">
                {READINESS.map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-hairline last:border-0 gap-3">
                    <div className="flex items-center gap-2.5">
                      <StateIndicator state={r.state as any} />
                      <span className="text-[12px] text-foreground">{r.label}</span>
                    </div>
                    <span className={`font-mono text-[10px] uppercase tracking-wider shrink-0 ${r.state === "ok" ? "text-emerald/70" : r.state === "pending" ? "text-cyan/70" : "text-yellow-500/70"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Confidential Transfer Visual */}
        <motion.div variants={item}>
          <SectionLabel>Confidential Transfer — Protocol View</SectionLabel>
          <Card className="p-6 overflow-hidden relative">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald/[0.03] via-transparent to-violet/[0.03]" />
            <div className="relative flex items-center gap-0">
              {/* Sender node */}
              <div className="flex-1">
                <div className="rounded-xl border border-emerald/20 bg-emerald/[0.06] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-emerald/60 mb-2">Sender</p>
                  <div className="font-mono text-[11px] text-foreground/60 space-y-1">
                    <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald" /><span>Identity: <span className="text-emerald">shielded</span></span></div>
                    <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald" /><span>Address: <span className="text-emerald">hidden</span></span></div>
                    <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald" /><span>Balance: <span className="text-emerald">private</span></span></div>
                  </div>
                </div>
              </div>

              {/* Arrow + ZK */}
              <div className="flex flex-col items-center gap-2 px-4 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-emerald/40 to-transparent" />
                  <div className="rounded-lg border border-hairline bg-surface-elevated px-3 py-1.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">ZK Proof</p>
                    <p className="font-mono text-[9px] text-emerald text-center">Verified ✓</p>
                  </div>
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-emerald/40 to-transparent" />
                </div>
              </div>

              {/* Settlement */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="rounded-xl border border-cyan/20 bg-cyan/[0.06] p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-cyan/60 mb-1">Settlement</p>
                  <p className="font-mono text-[10px] text-foreground">Solana</p>
                  <p className="font-mono text-[9px] text-muted-foreground">~400ms</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center px-4 shrink-0">
                <div className="h-px w-8 bg-gradient-to-r from-transparent via-violet/40 to-transparent" />
                <span className="text-violet/60 text-xs">→</span>
              </div>

              {/* Receiver */}
              <div className="flex-1">
                <div className="rounded-xl border border-violet/20 bg-violet/[0.06] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-violet/60 mb-2">Receiver</p>
                  <div className="font-mono text-[11px] text-foreground/60 space-y-1">
                    <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-violet" /><span>Identity: <span className="text-violet">shielded</span></span></div>
                    <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-violet" /><span>Address: <span className="text-violet">hidden</span></span></div>
                    <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-violet" /><span>Amount: <span className="text-violet">protected</span></span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-lg border border-hairline bg-surface/60 px-4 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="font-mono text-[10px] text-muted-foreground/70">Confidential transfer engine is in pilot scope. Protocol values shown are illustrative of the production experience.</span>
            </div>
          </Card>
        </motion.div>

        {/* Bottom row: Activity + Architecture */}
        <div className="grid gap-6 lg:grid-cols-2">

          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Recent Activity</SectionLabel>
              <Link to="/activity" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-emerald transition-colors">View all →</Link>
            </div>
            <Card className="divide-y divide-hairline overflow-hidden">
              {ACTIVITY.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${CAT_COLORS[ev.cat]}`}>
                    {ev.cat}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground leading-snug">{ev.event}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{ev.detail}</p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">{ev.ts}</span>
                </div>
              ))}
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Architecture Snapshot</SectionLabel>
              <Link to="/architecture" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-emerald transition-colors">View detail →</Link>
            </div>
            <Card className="p-4 space-y-2">
              {ARCH_NODES.map((n) => (
                <div key={n.label} className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-elevated px-3 py-2.5">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`} />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-foreground">{n.label}</p>
                    <p className="text-[10px] text-muted-foreground">{n.desc}</p>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 shrink-0">{n.state}</span>
                </div>
              ))}
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardWrapper() {
  return <AppShell><DashboardPage /></AppShell>;
}

export default DashboardWrapper;
