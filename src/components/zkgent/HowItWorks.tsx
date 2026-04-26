import { motion } from "framer-motion";
import { SectionHeader } from "./Section";

const steps = [
  {
    n: "01",
    title: "Deposit into a confidential pool",
    body: "Funds enter a shielded balance, decoupling them from public address activity.",
    micro: "shielded balance",
  },
  {
    n: "02",
    title: "Generate zero-knowledge proof",
    body: "A succinct proof attests to validity, ownership, and balance — without revealing them.",
    micro: "succinct · sound",
  },
  {
    n: "03",
    title: "Deliver encrypted payment note",
    body: "The receiver gets an encrypted note, decryptable only by the intended recipient.",
    micro: "out-of-band · async",
  },
  {
    n: "04",
    title: "Settle privately on Solana",
    body: "The protocol verifies the proof and settles the transfer with sub-second finality.",
    micro: "solana finality",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-32 lg:py-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-radial-fade opacity-40" />

      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="How it works"
          title={
            <>
              Four steps. <em className="italic text-gradient-emerald">Mathematically silent.</em>
            </>
          }
          description="A single confidential transfer, end to end."
        />

        <div className="relative mt-20">
          {/* Connector line — desktop */}
          <div className="pointer-events-none absolute left-0 right-0 top-[44px] hidden lg:block">
            <svg viewBox="0 0 1200 4" preserveAspectRatio="none" className="h-1 w-full">
              <line x1="0" y1="2" x2="1200" y2="2" stroke="oklch(1 0 0 / 8%)" strokeDasharray="3 6" />
              <motion.line
                x1="0" y1="2" x2="1200" y2="2"
                stroke="url(#step-flow)" strokeWidth="1.5"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                viewport={{ once: true }} transition={{ duration: 2.4, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="step-flow" x1="0" x2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0" />
                  <stop offset="50%" stopColor="oklch(0.78 0.16 160)" />
                  <stop offset="100%" stopColor="oklch(0.82 0.12 200)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Step number node */}
                <div className="relative mb-6 flex items-center">
                  <div className="relative flex h-[88px] w-[88px] items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald/10 blur-xl" />
                    <div className="absolute inset-2 rounded-full border border-emerald/30" />
                    <div className="absolute inset-4 rounded-full border border-hairline bg-surface" />
                    <span className="relative font-display text-3xl text-foreground">{s.n}</span>
                    <motion.span
                      className="absolute inset-0 rounded-full border border-emerald/40"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    />
                  </div>
                </div>

                <div className="pr-2">
                  <h3 className="text-balance text-lg font-medium leading-snug text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="h-1 w-1 rounded-full bg-emerald" />
                    {s.micro}
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
