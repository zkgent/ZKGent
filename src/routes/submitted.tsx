import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useApplication } from "@/context/ApplicationContext";

export const Route = createFileRoute("/submitted")({
  component: SubmittedPage,
});

const USE_CASE_LABELS: Record<string, string> = {
  payroll: "Private Payroll",
  treasury: "Treasury Operations",
  merchant: "Merchant Payments",
  remittance: "Remittance",
  transfers: "High-Sensitivity Transfers",
};

const TIMELINE = [
  {
    step: "Application received",
    desc: "Your application has been logged and is in the review queue.",
    done: true,
  },
  {
    step: "Internal review",
    desc: "OBSIDIAN team evaluates your use case and profile.",
    done: false,
  },
  {
    step: "Qualification",
    desc: "We confirm fit with the early access program criteria.",
    done: false,
  },
  {
    step: "Pilot conversation",
    desc: "A member of the team will reach out to schedule a call.",
    done: false,
  },
];

function SubmittedPage() {
  const { data, isSubmitted } = useApplication();
  const useCaseLabel = USE_CASE_LABELS[data.useCase] || data.useCase;

  if (!isSubmitted) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-muted-foreground text-[14px]">No application submitted yet.</p>
        <Link
          to="/apply"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition hover:opacity-90"
        >
          Start Application →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[360px] w-[600px] rounded-full bg-emerald/[0.05] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-xl px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald/30 bg-emerald/10"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11l5 5 9-9" stroke="oklch(0.78 0.16 160)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <h1 className="font-display text-2xl font-semibold text-foreground">Application received</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Thank you, {data.fullName ? data.fullName.split(" ")[0] : "applicant"}. We have your submission on file.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/8 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-cyan">Under Review</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 rounded-2xl border border-hairline bg-surface p-5"
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Submitted Information
          </p>
          <div className="space-y-3">
            {[
              { label: "Name", value: data.fullName },
              { label: "Email", value: data.workEmail },
              { label: "Company", value: data.company },
              { label: "Role", value: data.role },
              { label: "Use Case", value: useCaseLabel },
              { label: "Region", value: data.region },
              { label: "Monthly Volume", value: data.monthlyVolume },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 shrink-0">
                    {label}
                  </span>
                  <span className="text-[13px] text-foreground text-right">{value}</span>
                </div>
              ) : null
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 rounded-2xl border border-hairline bg-surface p-5"
        >
          <p className="mb-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Next Steps
          </p>
          <div className="space-y-0">
            {TIMELINE.map((item, i) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      item.done
                        ? "border-emerald/40 bg-emerald/15"
                        : "border-hairline bg-surface-elevated"
                    }`}
                  >
                    {item.done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="oklch(0.78 0.16 160)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className={`mt-1 w-px flex-1 min-h-[28px] ${item.done ? "bg-emerald/20" : "bg-hairline"}`} />
                  )}
                </div>
                <div className="pb-5">
                  <p className={`text-[13px] font-medium ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {item.step}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-center"
        >
          <Link
            to="/dashboard"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-3 text-[13px] font-medium text-background transition-all hover:shadow-[0_0_30px_-8px_rgba(255,255,255,0.4)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">View Dashboard Preview</span>
            <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <p className="mt-3 text-[11px] text-muted-foreground/50">
            Estimated review window: 5–7 business days
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function Submitted() {
  return (
    <AppShell>
      <SubmittedPage />
    </AppShell>
  );
}
