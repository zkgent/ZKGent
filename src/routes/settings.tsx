import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsWrapper,
});

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
        enabled ? "bg-emerald" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow transition-transform duration-200",
        enabled ? "translate-x-4" : "translate-x-0.5"
      )} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-4 border-b border-hairline last:border-0">
      <div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {desc && <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">{children}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-hairline bg-surface px-5">{children}</div>;
}

function SettingsPage() {
  const [privacy, setPrivacy] = useState({
    privacyMode: true,
    hideAmounts: true,
    shieldedAddress: false,
    auditLog: true,
  });

  const [notifications, setNotifications] = useState({
    transferSettled: true,
    payrollApproved: true,
    counterpartyKyc: false,
    systemAlerts: true,
  });

  const toggle = (group: "privacy" | "notifications", key: string) => {
    if (group === "privacy") setPrivacy((p) => ({ ...p, [key]: !p[key as keyof typeof p] }));
    else setNotifications((n) => ({ ...n, [key]: !n[key as keyof typeof n] }));
  };

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

          <motion.div variants={item}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">System</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
          </motion.div>

          {/* Organization */}
          <motion.div variants={item}>
            <SectionTitle>Organization</SectionTitle>
            <Card>
              <SettingRow label="Workspace name" desc="Displayed in the console header">
                <input defaultValue="OBSIDIAN Workspace"
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 w-44" />
              </SettingRow>
              <SettingRow label="Environment" desc="Current runtime environment">
                <select defaultValue="devnet"
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                  <option value="devnet">Solana Devnet</option>
                  <option value="mainnet">Solana Mainnet</option>
                </select>
              </SettingRow>
              <SettingRow label="Default payment rail" desc="Used when creating transfers">
                <select defaultValue="usdc"
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                  <option value="usdc">USDC · Shielded</option>
                  <option value="sol">SOL · Confidential</option>
                </select>
              </SettingRow>
            </Card>
          </motion.div>

          {/* Privacy defaults */}
          <motion.div variants={item}>
            <SectionTitle>Privacy Defaults</SectionTitle>
            <Card>
              <SettingRow label="Privacy mode" desc="Enable confidential channel for all operations">
                <Toggle enabled={privacy.privacyMode} onChange={(v) => setPrivacy((p) => ({ ...p, privacyMode: v }))} />
              </SettingRow>
              <SettingRow label="Hide amounts in UI" desc="Mask values in dashboard and lists">
                <Toggle enabled={privacy.hideAmounts} onChange={(v) => setPrivacy((p) => ({ ...p, hideAmounts: v }))} />
              </SettingRow>
              <SettingRow label="Shielded operator address" desc="Conceal workspace address from public chain queries">
                <Toggle enabled={privacy.shieldedAddress} onChange={(v) => setPrivacy((p) => ({ ...p, shieldedAddress: v }))} />
              </SettingRow>
              <SettingRow label="Audit log retention" desc="Retain encrypted event log for compliance">
                <Toggle enabled={privacy.auditLog} onChange={(v) => setPrivacy((p) => ({ ...p, auditLog: v }))} />
              </SettingRow>
            </Card>
          </motion.div>

          {/* Disclosure policy */}
          <motion.div variants={item}>
            <SectionTitle>Disclosure Policy</SectionTitle>
            <Card>
              <SettingRow label="Policy mode" desc="Who can decrypt transaction records">
                <select defaultValue="audit"
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                  <option value="audit">Audit-only</option>
                  <option value="operator">Operator + Audit</option>
                  <option value="none">No disclosure</option>
                </select>
              </SettingRow>
              <SettingRow label="Compliance key" desc="Fingerprint of registered audit key">
                <span className="font-mono text-[11px] text-muted-foreground/60 rounded border border-hairline bg-surface-elevated px-2 py-1">
                  OBD:KEY:A4F2...9E1C
                </span>
              </SettingRow>
              <div className="py-3">
                <button className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition">
                  Rotate Compliance Key →
                </button>
              </div>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item}>
            <SectionTitle>Notifications</SectionTitle>
            <Card>
              <SettingRow label="Transfer settled" desc="Alert when a transfer reaches finality">
                <Toggle enabled={notifications.transferSettled} onChange={() => toggle("notifications", "transferSettled")} />
              </SettingRow>
              <SettingRow label="Payroll approved" desc="Alert when batch reaches approval threshold">
                <Toggle enabled={notifications.payrollApproved} onChange={() => toggle("notifications", "payrollApproved")} />
              </SettingRow>
              <SettingRow label="Counterparty KYC" desc="Alert when KYC verification completes">
                <Toggle enabled={notifications.counterpartyKyc} onChange={() => toggle("notifications", "counterpartyKyc")} />
              </SettingRow>
              <SettingRow label="System alerts" desc="Proof engine status and connectivity events">
                <Toggle enabled={notifications.systemAlerts} onChange={() => toggle("notifications", "systemAlerts")} />
              </SettingRow>
            </Card>
          </motion.div>

          {/* Connectivity state */}
          <motion.div variants={item}>
            <SectionTitle>System Connectivity</SectionTitle>
            <div className="rounded-2xl border border-hairline bg-surface px-5 divide-y divide-hairline">
              {[
                { label: "Solana RPC", state: "Connected", sub: "api.devnet.solana.com", dot: "bg-emerald" },
                { label: "ZK Proof Engine", state: "In Setup", sub: "Local verifier not yet active", dot: "bg-cyan animate-pulse" },
                { label: "Audit Key Service", state: "Connected", sub: "Key fingerprint: OBD:KEY:A4F2", dot: "bg-emerald" },
                { label: "KYC Provider", state: "Not Connected", sub: "Configure in counterparty settings", dot: "bg-muted-foreground/40" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{c.label}</p>
                      <p className="text-[11px] text-muted-foreground">{c.sub}</p>
                    </div>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${c.dot.includes("emerald") ? "text-emerald/70" : c.dot.includes("cyan") ? "text-cyan/70" : "text-muted-foreground/60"}`}>
                    {c.state}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Save */}
          <motion.div variants={item} className="flex gap-3">
            <button className="rounded-full bg-foreground px-6 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition">
              Save Settings
            </button>
            <button className="rounded-full border border-hairline px-6 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition">
              Reset to Defaults
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function SettingsWrapper() {
  return <AppShell><SettingsPage /></AppShell>;
}

export default SettingsWrapper;
