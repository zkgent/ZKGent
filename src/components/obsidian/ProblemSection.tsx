import { motion } from "framer-motion";
import { SectionHeader } from "./Section";

const issues = [
  {
    code: "01",
    title: "Payroll data should not be public",
    body: "Salaries, bonuses, and contractor relationships are competitive intelligence.",
  },
  {
    code: "02",
    title: "Treasury strategy should not be exposed",
    body: "Onchain transfers reveal counterparties, timing, and execution intent.",
  },
  {
    code: "03",
    title: "Merchant flows should stay confidential",
    body: "Revenue, suppliers, and unit economics shouldn't be auditable by competitors.",
  },
  {
    code: "04",
    title: "Remittance should not be surveilled",
    body: "Cross-border relationships and amounts deserve cryptographic discretion.",
  },
];

export function ProblemSection() {
  return (
    <section id="vision" className="relative py-32 lg:py-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine mask-radial-fade opacity-50" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeader
            eyebrow="The problem"
            title={
              <>
                Radical transparency was never the goal —{" "}
                <em className="italic text-muted-foreground">verifiability was.</em>
              </>
            }
            description="Public ledgers conflate two distinct properties: cryptographic integrity and informational exposure. Real financial systems require the first, not the second."
          />

          {/* Exposed ledger metaphor */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="mt-10 hairline rounded-xl bg-surface/60 p-5 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Public ledger · live
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-destructive">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> exposed
              </span>
            </div>
            <div className="mt-4 space-y-2.5 font-mono text-[11px]">
              {[
                ["0x4a…91", "0x8c…3f", "$ 184,000.00"],
                ["0x91…bb", "0x2e…77", "$  42,500.00"],
                ["0x4a…91", "0x55…0a", "$   9,800.00"],
                ["0x12…d4", "0x8c…3f", "$ 612,000.00"],
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">{row[0]}</span>
                  <span className="text-foreground/40">→</span>
                  <span className="text-muted-foreground">{row[1]}</span>
                  <span className="text-destructive/80">{row[2]}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <ul className="space-y-4">
          {issues.map((issue, i) => (
            <motion.li
              key={issue.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface/50 p-7 backdrop-blur transition-all duration-500 hover:border-emerald/30 hover:bg-surface"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald/0 blur-3xl transition-all duration-700 group-hover:bg-emerald/10" />
              <div className="flex items-start gap-6">
                <span className="font-mono text-[11px] tracking-widest text-muted-foreground/60">
                  {issue.code}
                </span>
                <div className="flex-1">
                  <h3 className="text-balance text-xl font-medium leading-snug text-foreground">
                    {issue.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {issue.body}
                  </p>
                </div>
                <span className="mt-1.5 text-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-emerald">
                  →
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
