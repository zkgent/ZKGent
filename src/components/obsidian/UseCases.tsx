import { motion } from "framer-motion";
import { SectionHeader } from "./Section";

const cases = [
  {
    code: "PAY/01",
    title: "Private Payroll",
    body: "Compensate global teams without exposing salaries, bonus structure, or headcount on a public ledger.",
    meta: "for finance & ops teams",
    icon: PayrollIcon,
    accent: "emerald",
  },
  {
    code: "TRS/02",
    title: "Treasury Operations",
    body: "Move capital between wallets, custodians, and venues without telegraphing strategy to the market.",
    meta: "for treasuries & funds",
    icon: TreasuryIcon,
    accent: "cyan",
  },
  {
    code: "MRC/03",
    title: "Merchant Payments",
    body: "Accept stablecoin payments at scale with confidential revenue, supplier flows, and unit economics.",
    meta: "for commerce platforms",
    icon: MerchantIcon,
    accent: "violet",
  },
  {
    code: "RMT/04",
    title: "Remittance",
    body: "Cross-border value transfer with cryptographic privacy for both senders and receivers.",
    meta: "for remittance corridors",
    icon: RemittanceIcon,
    accent: "emerald",
  },
  {
    code: "SEN/05",
    title: "High-Sensitivity Transfers",
    body: "Settlements where counterparty discretion is a hard requirement, not a preference.",
    meta: "for institutional flows",
    icon: SensitiveIcon,
    accent: "cyan",
  },
] as const;

const accentMap = {
  emerald: { ring: "hover:border-emerald/40", glow: "group-hover:bg-emerald/10", text: "text-emerald" },
  cyan: { ring: "hover:border-cyan/40", glow: "group-hover:bg-cyan/10", text: "text-cyan" },
  violet: { ring: "hover:border-violet/40", glow: "group-hover:bg-violet/10", text: "text-violet" },
};

export function UseCases() {
  return (
    <section id="use-cases" className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Use cases"
          title={
            <>
              Built for operations where{" "}
              <em className="italic text-muted-foreground">discretion is non-negotiable.</em>
            </>
          }
          description="OBSIDIAN is infrastructure for serious financial workflows — not retail speculation."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {cases.map((c, i) => {
            const a = accentMap[c.accent];
            const span = i === 0 ? "lg:col-span-3" : i === 1 ? "lg:col-span-3" : "lg:col-span-2";
            return (
              <motion.article
                key={c.code}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative overflow-hidden rounded-2xl border border-hairline bg-surface/50 p-7 backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:bg-surface ${a.ring} ${span}`}
              >
                <div className={`pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-transparent blur-3xl transition-all duration-700 ${a.glow}`} />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex h-full flex-col">
                  <div className={`mb-7 flex h-12 w-12 items-center justify-center rounded-lg border border-hairline bg-surface-elevated ${a.text}`}>
                    <c.icon />
                  </div>

                  <h3 className="text-[22px] font-medium leading-tight text-foreground">{c.title}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{c.body}</p>

                  <div className="mt-auto flex items-center justify-between pt-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      {c.meta}
                    </span>
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground/50">
                      {c.code}
                    </span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PayrollIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="8" cy="14.5" r="1" />
    </svg>
  );
}
function TreasuryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 9 12 4l9 5" />
      <path d="M5 9v9M19 9v9M9 12v6M15 12v6M3 21h18" />
    </svg>
  );
}
function MerchantIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 7h16l-1 4H5L4 7z" />
      <path d="M5 11v8h14v-8" />
      <path d="M9 15h6" />
    </svg>
  );
}
function RemittanceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
function SensitiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
