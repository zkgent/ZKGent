import { motion } from "framer-motion";
import { SectionHeader } from "./Section";

const items = [
  {
    year: "2024",
    title: "Stablecoins are becoming real payment rails",
    body: "Stablecoin volume now rivals major card networks. Settlement infrastructure is being rewritten.",
  },
  {
    year: "2025",
    title: "Onchain finance is maturing",
    body: "Treasuries, payroll providers, and merchants are operationalizing onchain workflows at production scale.",
  },
  {
    year: "Now",
    title: "Radical transparency is the wrong default",
    body: "Public ledgers expose strategy, headcount, and counterparties to competitors and adversaries alike.",
  },
  {
    year: "Next",
    title: "Privacy with mathematical integrity",
    body: "Operators need confidentiality that doesn't compromise auditability. Zero-knowledge makes both possible.",
  },
];

export function WhyNow() {
  return (
    <section className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Why now"
          title={
            <>
              The moment when payments quietly{" "}
              <em className="italic text-gradient-emerald">grew up.</em>
            </>
          }
        />

        <div className="relative mx-auto mt-20 max-w-4xl">
          {/* Vertical line */}
          <div className="pointer-events-none absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-hairline to-transparent sm:left-[calc(8rem+7px)]" />
          <motion.div
            className="pointer-events-none absolute left-[7px] top-2 w-px bg-gradient-to-b from-emerald via-cyan to-transparent sm:left-[calc(8rem+7px)]"
            initial={{ height: 0 }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          <ol className="space-y-14">
            {items.map((it, i) => (
              <motion.li
                key={it.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className="relative grid grid-cols-1 items-start gap-3 pl-10 sm:grid-cols-[8rem_auto_1fr] sm:gap-8 sm:pl-0"
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground sm:pt-1.5 sm:text-right">
                  {it.year}
                </div>
                <div className="absolute left-0 top-1.5 sm:left-[8rem]">
                  <div className="relative flex h-4 w-4 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald/30 blur-md" />
                    <div className="relative h-3 w-3 rounded-full border border-emerald/60 bg-background">
                      <div className="absolute inset-1 rounded-full bg-emerald" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-balance text-xl font-medium leading-snug text-foreground sm:text-[22px]">
                    {it.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{it.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
