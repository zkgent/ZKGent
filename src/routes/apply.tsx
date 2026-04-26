import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useApplication } from "@/context/ApplicationContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apply")({
  component: ApplyPage,
});

const USE_CASES = [
  { id: "payroll", label: "Private Payroll", desc: "Confidential salary and contractor disbursements" },
  { id: "treasury", label: "Treasury Operations", desc: "Private multi-sig treasury movements" },
  { id: "merchant", label: "Merchant Payments", desc: "Shielded point-of-sale and e-commerce settlement" },
  { id: "remittance", label: "Remittance", desc: "Cross-border transfers without public exposure" },
  { id: "transfers", label: "High-Sensitivity Transfers", desc: "Institutional and high-value confidential flows" },
];

const TEAM_SIZES = ["1–5", "6–20", "21–100", "101–500", "500+"];
const REGIONS = ["North America", "Europe", "Asia-Pacific", "Latin America", "Middle East & Africa", "Other"];
const VOLUMES = ["< $10K / mo", "$10K–$100K / mo", "$100K–$1M / mo", "$1M–$10M / mo", "$10M+ / mo"];
const RAILS = ["ACH / Wire", "SWIFT", "Solana SPL", "Ethereum / EVM", "Stablecoins", "Other crypto"];
const CONCERNS = [
  "Counterparty surveillance",
  "On-chain data exposure",
  "Regulatory reporting risk",
  "Competitive intelligence leakage",
  "Internal access control",
  "Other",
];

const STEPS = ["Identity", "Use Case", "Payment Profile", "Review"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-mono font-medium transition-all duration-300",
                i < current
                  ? "border-emerald bg-emerald/20 text-emerald"
                  : i === current
                  ? "border-emerald bg-emerald text-background"
                  : "border-hairline bg-surface text-muted-foreground/40"
              )}
            >
              {i < current ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "hidden sm:block font-mono text-[9px] uppercase tracking-wider transition-colors",
                i === current ? "text-emerald" : i < current ? "text-emerald/60" : "text-muted-foreground/40"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-4 h-px w-8 sm:w-14 transition-colors duration-500",
                i < current ? "bg-emerald/40" : "bg-hairline"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-emerald">*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-emerald/50 focus:ring-1 focus:ring-emerald/20"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-[14px] text-foreground outline-none transition-all focus:border-emerald/50 focus:ring-1 focus:ring-emerald/20 appearance-none"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function RadioCard({
  selected,
  onSelect,
  label,
  desc,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all duration-200",
        selected
          ? "border-emerald/50 bg-emerald/8 shadow-[0_0_20px_-8px_rgba(120,200,140,0.3)]"
          : "border-hairline bg-surface hover:border-emerald/25 hover:bg-surface-elevated"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all",
            selected ? "border-emerald bg-emerald" : "border-muted-foreground/30"
          )}
        >
          {selected && (
            <div className="h-1.5 w-1.5 rounded-full bg-background" />
          )}
        </div>
        <div>
          <div className="text-[13px] font-medium text-foreground">{label}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">{desc}</div>
        </div>
      </div>
    </button>
  );
}

const variants = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * 40, opacity: 0 }),
};

function Step1({ data, update }: { data: any; update: any }) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel required>Full Name</FieldLabel>
        <TextInput value={data.fullName} onChange={(v) => update({ fullName: v })} placeholder="Your full name" />
      </div>
      <div>
        <FieldLabel required>Work Email</FieldLabel>
        <TextInput type="email" value={data.workEmail} onChange={(v) => update({ workEmail: v })} placeholder="you@company.com" />
      </div>
      <div>
        <FieldLabel required>Company / Project</FieldLabel>
        <TextInput value={data.company} onChange={(v) => update({ company: v })} placeholder="Your company or project name" />
      </div>
      <div>
        <FieldLabel required>Role</FieldLabel>
        <TextInput value={data.role} onChange={(v) => update({ role: v })} placeholder="e.g. CFO, Head of Engineering, Founder" />
      </div>
    </div>
  );
}

function Step2({ data, update }: { data: any; update: any }) {
  return (
    <div className="space-y-6">
      <div>
        <FieldLabel required>Primary Use Case</FieldLabel>
        <div className="mt-2 space-y-2">
          {USE_CASES.map((uc) => (
            <RadioCard
              key={uc.id}
              selected={data.useCase === uc.id}
              onSelect={() => update({ useCase: uc.id })}
              label={uc.label}
              desc={uc.desc}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Team Size</FieldLabel>
          <SelectInput value={data.teamSize} onChange={(v) => update({ teamSize: v })} options={TEAM_SIZES} placeholder="Select" />
        </div>
        <div>
          <FieldLabel required>Region</FieldLabel>
          <SelectInput value={data.region} onChange={(v) => update({ region: v })} options={REGIONS} placeholder="Select" />
        </div>
      </div>
    </div>
  );
}

function Step3({ data, update }: { data: any; update: any }) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel required>Monthly Payment Volume</FieldLabel>
        <SelectInput value={data.monthlyVolume} onChange={(v) => update({ monthlyVolume: v })} options={VOLUMES} placeholder="Select range" />
      </div>
      <div>
        <FieldLabel required>Current Payment Rail</FieldLabel>
        <SelectInput value={data.currentRail} onChange={(v) => update({ currentRail: v })} options={RAILS} placeholder="Select" />
      </div>
      <div>
        <FieldLabel required>Biggest Privacy Concern</FieldLabel>
        <SelectInput value={data.privacyConcern} onChange={(v) => update({ privacyConcern: v })} options={CONCERNS} placeholder="Select" />
      </div>
      <div>
        <FieldLabel required>Why confidential payments matter to you</FieldLabel>
        <textarea
          value={data.whyConfidential}
          onChange={(e) => update({ whyConfidential: e.target.value })}
          placeholder="Describe your specific situation or use case in a few sentences..."
          rows={4}
          className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-emerald/50 focus:ring-1 focus:ring-emerald/20 resize-none"
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-hairline last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{label}</span>
      <span className="text-[13px] text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

function Step4({ data }: { data: any }) {
  const useCaseLabel = USE_CASES.find((u) => u.id === data.useCase)?.label || data.useCase;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Identity</p>
        <SummaryRow label="Name" value={data.fullName} />
        <SummaryRow label="Email" value={data.workEmail} />
        <SummaryRow label="Company" value={data.company} />
        <SummaryRow label="Role" value={data.role} />
      </div>
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Use Case</p>
        <SummaryRow label="Primary use case" value={useCaseLabel} />
        <SummaryRow label="Team size" value={data.teamSize} />
        <SummaryRow label="Region" value={data.region} />
      </div>
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Payment Profile</p>
        <SummaryRow label="Monthly volume" value={data.monthlyVolume} />
        <SummaryRow label="Current rail" value={data.currentRail} />
        <SummaryRow label="Privacy concern" value={data.privacyConcern} />
        <SummaryRow label="Context" value={data.whyConfidential} />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-emerald/20 bg-emerald/5 p-4">
        <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald mt-1.5" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Your application is reviewed by the OBSIDIAN core team. All information is handled with strict confidentiality. We typically respond within 5–7 business days.
        </p>
      </div>
    </div>
  );
}

function canAdvance(step: number, data: any): boolean {
  if (step === 0) return !!(data.fullName && data.workEmail && data.company && data.role);
  if (step === 1) return !!(data.useCase && data.teamSize && data.region);
  if (step === 2) return !!(data.monthlyVolume && data.currentRail && data.privacyConcern && data.whyConfidential);
  return true;
}

function ApplyPage() {
  const { data, update, submit } = useApplication();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = () => {
    submit();
    navigate({ to: "/submitted" });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet/[0.04] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">
            Early Access Application
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {STEPS[step]}
          </h1>
        </div>

        <div className="mb-10 flex justify-center">
          <StepIndicator current={step} />
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && <Step1 data={data} update={update} />}
              {step === 1 && <Step2 data={data} update={update} />}
              {step === 2 && <Step3 data={data} update={update} />}
              {step === 3 && <Step4 data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={goPrev}
            className={cn(
              "flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-[13px] font-medium text-muted-foreground transition-all hover:text-foreground hover:border-foreground/20",
              step === 0 && "invisible"
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7 2L3 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              disabled={!canAdvance(step, data)}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-2.5 text-[13px] font-medium text-background transition-all hover:shadow-[0_0_30px_-8px_rgba(255,255,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Continue</span>
              <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-2.5 text-[13px] font-medium text-background transition-all hover:shadow-[0_0_30px_-8px_rgba(255,255,255,0.4)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Request Early Access</span>
              <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Apply() {
  return (
    <AppShell>
      <ApplyPage />
    </AppShell>
  );
}
