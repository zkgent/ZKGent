import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { api, type Settings } from "@/lib/api";

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

const DEFAULTS: Settings = {
  workspaceName: "ZKGENT Workspace",
  environment: "devnet",
  defaultPaymentRail: "USDC",
  privacyMode: true,
  hideAmounts: true,
  shieldedAddress: false,
  disclosurePolicy: "audit-only",
  complianceKeyFingerprint: "",
  notifyTransferSettled: true,
  notifyPayrollApproved: true,
  notifyCounterpartyKyc: false,
  notifySystemAlerts: true,
};

function SettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.settings.get()
      .then((s) => setForm(s))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = (k: keyof Settings) => set(k, !form[k] as Settings[typeof k]);

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      await api.settings.update(form);
      setSaveMsg("Settings saved");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const s = await api.settings.update(DEFAULTS);
      setForm(s);
      setSaveMsg("Reset to defaults");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch { } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-5">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl border border-hairline bg-surface animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

          <motion.div variants={item}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">System</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
          </motion.div>

          {error && <motion.div variants={item} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">{error}</motion.div>}

          <motion.div variants={item}>
            <SectionTitle>Organization</SectionTitle>
            <Card>
              <SettingRow label="Workspace name" desc="Displayed in the console header">
                <input value={form.workspaceName} onChange={(e) => set("workspaceName", e.target.value)}
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 w-44" />
              </SettingRow>
              <SettingRow label="Environment" desc="Current runtime environment">
                <select value={form.environment} onChange={(e) => set("environment", e.target.value)}
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                  <option value="devnet">Solana Devnet</option>
                  <option value="mainnet">Solana Mainnet</option>
                </select>
              </SettingRow>
              <SettingRow label="Default asset" desc="Used when creating transfers">
                <select value={form.defaultPaymentRail} onChange={(e) => set("defaultPaymentRail", e.target.value)}
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                  <option value="USDC">USDC · Shielded</option>
                  <option value="SOL">SOL · Confidential</option>
                </select>
              </SettingRow>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <SectionTitle>Privacy Defaults</SectionTitle>
            <Card>
              <SettingRow label="Privacy mode" desc="Enable confidential channel for all operations">
                <Toggle enabled={form.privacyMode} onChange={() => toggle("privacyMode")} />
              </SettingRow>
              <SettingRow label="Hide amounts in UI" desc="Mask values in dashboard and lists">
                <Toggle enabled={form.hideAmounts} onChange={() => toggle("hideAmounts")} />
              </SettingRow>
              <SettingRow label="Shielded operator address" desc="Conceal workspace address from public chain queries">
                <Toggle enabled={form.shieldedAddress} onChange={() => toggle("shieldedAddress")} />
              </SettingRow>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <SectionTitle>Disclosure Policy</SectionTitle>
            <Card>
              <SettingRow label="Policy mode" desc="Who can decrypt transaction records">
                <select value={form.disclosurePolicy} onChange={(e) => set("disclosurePolicy", e.target.value)}
                  className="rounded-lg border border-hairline bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-emerald/50 appearance-none">
                  <option value="audit-only">Audit-only</option>
                  <option value="operator+audit">Operator + Audit</option>
                  <option value="none">No disclosure</option>
                </select>
              </SettingRow>
              <SettingRow label="Compliance key" desc="Fingerprint of registered audit key">
                <span className="font-mono text-[11px] text-muted-foreground/60 rounded border border-hairline bg-surface-elevated px-2 py-1">
                  {form.complianceKeyFingerprint || "OBD:KEY:—"}
                </span>
              </SettingRow>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <SectionTitle>Notifications</SectionTitle>
            <Card>
              <SettingRow label="Transfer settled" desc="Alert when a transfer reaches finality">
                <Toggle enabled={form.notifyTransferSettled} onChange={() => toggle("notifyTransferSettled")} />
              </SettingRow>
              <SettingRow label="Payroll approved" desc="Alert when batch reaches approval threshold">
                <Toggle enabled={form.notifyPayrollApproved} onChange={() => toggle("notifyPayrollApproved")} />
              </SettingRow>
              <SettingRow label="Counterparty KYC" desc="Alert when KYC verification completes">
                <Toggle enabled={form.notifyCounterpartyKyc} onChange={() => toggle("notifyCounterpartyKyc")} />
              </SettingRow>
              <SettingRow label="System alerts" desc="Proof engine status and connectivity events">
                <Toggle enabled={form.notifySystemAlerts} onChange={() => toggle("notifySystemAlerts")} />
              </SettingRow>
            </Card>
          </motion.div>

          <motion.div variants={item} className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="rounded-full bg-foreground px-6 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition disabled:opacity-50">
              {saving ? "Saving…" : "Save Settings"}
            </button>
            <button onClick={reset} disabled={saving}
              className="rounded-full border border-hairline px-6 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition disabled:opacity-50">
              Reset to Defaults
            </button>
            {saveMsg && <span className="font-mono text-[11px] text-emerald animate-in fade-in">{saveMsg}</span>}
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
