import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useApplication } from "@/context/ApplicationContext";
import type { ApplicationRecord } from "@/context/ApplicationContext";

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

const USE_CASE_LABELS: Record<string, string> = {
  payroll: "Private Payroll",
  treasury: "Treasury Operations",
  merchant: "Merchant Payments",
  remittance: "Remittance",
  transfers: "High-Sensitivity Transfers",
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  under_review: { label: "Under Review", color: "text-cyan", dot: "bg-cyan" },
  qualified: { label: "Qualified", color: "text-emerald", dot: "bg-emerald" },
  pilot_candidate: { label: "Pilot Candidate", color: "text-emerald", dot: "bg-emerald" },
  contacted: { label: "Contacted", color: "text-violet", dot: "bg-violet" },
  rejected: { label: "Not Moving Forward", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

function Module({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-hairline bg-surface p-5 ${className}`}>{children}</div>;
}
function ModuleLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{children}</p>;
}
function StatusRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-hairline last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</span>
      <span className={`text-[13px] font-medium ${accent || "text-foreground"}`}>{value}</span>
    </div>
  );
}

const ARCH_ITEMS = [
  { label: "Confidential Notes", desc: "UTXO-style private value commitments", status: "Pilot scope" },
  { label: "ZK Verification", desc: "Groth16 proof system on Solana", status: "In development" },
  { label: "Solana Settlement", desc: "Sub-second finality at minimal cost", status: "In development" },
  { label: "Access Controls", desc: "Selective disclosure for compliance", status: "Planned" },
];

const ROADMAP = [
  { label: "Confidential transfers", status: "Pilot scope", active: true },
  { label: "Batch payroll", status: "Q3 2025", active: false },
  { label: "Treasury routing", status: "Q3 2025", active: false },
  { label: "Merchant settlement", status: "Q4 2025", active: false },
  { label: "Selective disclosure controls", status: "Q1 2026", active: false },
];

const OPERATOR_NOTES = [
  { title: "Built for operational privacy", body: "OBSIDIAN is designed for businesses that require payment confidentiality as a core operational requirement, not an afterthought." },
  { title: "Verifiability without public exposure", body: "ZK proofs allow counterparties and auditors to verify transaction validity without exposing sender, receiver, or amount to the public ledger." },
  { title: "Early partners shape the rollout", body: "Access program participants influence protocol priorities, integration depth, and pilot feature sequencing." },
];

const USE_CASE_READINESS = [
  { label: "Payroll", desc: "Private salary disbursements", status: "In development", dot: "bg-emerald" },
  { label: "Treasury", desc: "Shielded multi-sig movements", status: "In development", dot: "bg-cyan" },
  { label: "Merchant Payments", desc: "Confidential point-of-sale", status: "Planned", dot: "bg-violet" },
  { label: "Remittance", desc: "Cross-border private transfers", status: "Planned", dot: "bg-muted-foreground/40" },
];

function DashboardPage() {
  const { applicationId } = useApplication();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) { setLoading(false); return; }
    fetch(`/api/applications/${applicationId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setApplication(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [applicationId]);

  const statusInfo = application ? (STATUS_META[application.status] || STATUS_META.under_review) : null;
  const useCaseLabel = application ? (USE_CASE_LABELS[application.useCase] || application.useCase) : "—";

  const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

  return (
    <div className="min-h-full bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-emerald/[0.04] blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-violet/[0.03] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Dashboard</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Access Overview</h1>
          </div>
          {!applicationId && (
            <Link to="/apply"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[12px] font-medium text-background hover:opacity-90 transition">
              Apply Now →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-emerald" />
            <span className="font-mono text-[12px] uppercase tracking-wider">Loading…</span>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            <motion.div variants={itemVariants} className="lg:col-span-1">
              <Module className="h-full">
                <ModuleLabel>Access Status</ModuleLabel>
                <StatusRow label="Tier" value="Early Access" accent="text-emerald" />
                <StatusRow label="Status"
                  value={loading ? "…" : (statusInfo?.label || "Not Applied")}
                  accent={statusInfo?.color} />
                <StatusRow label="Use Case" value={useCaseLabel} />
                <StatusRow label="Region" value={application?.region || "—"} />
                <StatusRow label="Applied" value={application ? new Date(application.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
                <StatusRow label="Review Window" value="5–7 business days" />
              </Module>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Module>
                <ModuleLabel>Confidential Transfer Preview</ModuleLabel>
                <div className="space-y-2 mb-4">
                  {[
                    { label: "Sender", status: "hidden", color: "text-emerald", dot: "bg-emerald" },
                    { label: "Receiver", status: "hidden", color: "text-cyan", dot: "bg-cyan" },
                    { label: "Amount", status: "hidden", color: "text-violet", dot: "bg-violet" },
                    { label: "ZK Proof", status: "verified", color: "text-emerald", dot: "bg-emerald" },
                    { label: "Settlement", status: "pending", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
                  ].map((f) => (
                    <div key={f.label}
                      className="flex items-center justify-between rounded-lg border border-hairline bg-surface-elevated px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</span>
                      </div>
                      <span className={`font-mono text-[11px] font-medium ${f.color}`}>{f.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground/60">ZK transfer engine</span>
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-violet border border-violet/20 bg-violet/5 px-1.5 py-0.5 rounded">Pilot scope</span>
                </div>
              </Module>
            </motion.div>

            <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3">
              <Module>
                <ModuleLabel>Use Case Readiness</ModuleLabel>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {USE_CASE_READINESS.map((uc) => (
                    <div key={uc.label} className="rounded-xl border border-hairline bg-surface-elevated p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${uc.dot}`} />
                        <span className="text-[13px] font-medium text-foreground">{uc.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">{uc.desc}</p>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">{uc.status}</span>
                    </div>
                  ))}
                </div>
              </Module>
            </motion.div>

            <motion.div variants={itemVariants} className="md:col-span-2">
              <Module>
                <ModuleLabel>Architecture Snapshot</ModuleLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ARCH_ITEMS.map((a) => (
                    <div key={a.label} className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-elevated p-3.5">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[12px] font-medium text-foreground">{a.label}</p>
                          <span className="font-mono text-[9px] text-muted-foreground/60">{a.status}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Module>
            </motion.div>

            <motion.div variants={itemVariants} className="md:col-span-1">
              <Module className="h-full">
                <ModuleLabel>Roadmap</ModuleLabel>
                <div className="space-y-2.5">
                  {ROADMAP.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.active ? "bg-emerald" : "bg-muted-foreground/30"}`} />
                        <span className={`text-[12px] ${item.active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{item.label}</span>
                      </div>
                      <span className={`font-mono text-[9px] uppercase tracking-wider shrink-0 ${item.active ? "text-emerald" : "text-muted-foreground/50"}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </Module>
            </motion.div>

            <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3">
              <Module>
                <ModuleLabel>Operator Notes</ModuleLabel>
                <div className="grid gap-4 sm:grid-cols-3">
                  {OPERATOR_NOTES.map((note) => (
                    <div key={note.title} className="rounded-xl border border-hairline bg-surface-elevated p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald/60" />
                        <p className="text-[12px] font-semibold text-foreground">{note.title}</p>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground pl-3">{note.body}</p>
                    </div>
                  ))}
                </div>
              </Module>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DashboardWrapper() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}

export default DashboardWrapper;
