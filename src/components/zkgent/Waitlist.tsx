import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export function Waitlist() {
  return (
    <section id="platform" className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-hairline bg-surface/40 p-10 backdrop-blur-xl sm:p-16"
        >
          <div className="pointer-events-none absolute inset-0 rounded-3xl">
            <div
              className="absolute -inset-px rounded-3xl opacity-60 animate-border-glow"
              style={{
                background:
                  "conic-gradient(from 180deg at 50% 50%, oklch(0.78 0.16 160 / 0.4), transparent 25%, oklch(0.82 0.12 200 / 0.3) 50%, transparent 75%, oklch(0.7 0.18 295 / 0.3))",
              }}
            />
            <div className="absolute inset-px rounded-3xl bg-surface/95 backdrop-blur-xl" />
          </div>

          <div className="pointer-events-none absolute -top-32 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-emerald/15 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30 mask-radial-fade" />

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/[0.07] px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-yellow-100/80">
                Devnet alpha · Invitation only
              </span>
            </div>

            <h2 className="mt-7 text-balance font-display text-4xl leading-[1] tracking-tight text-foreground sm:text-5xl lg:text-[60px]">
              Enter the <em className="italic text-gradient-emerald">confidential</em> console.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-muted-foreground">
              ZKGent is in early-access on Solana devnet. Approved teams get a full operator workspace for confidential transfers, payroll, treasury, and counterparties.
            </p>

            <ol className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              {[
                { n: "01", t: "Apply", d: "Tell us about your team and use case." },
                { n: "02", t: "Review", d: "5–7 business days for approval." },
                { n: "03", t: "Connect & launch", d: "Link your Solana wallet to start." },
              ].map((s) => (
                <li key={s.n} className="rounded-xl border border-hairline bg-surface/60 p-4 backdrop-blur">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">{s.n}</p>
                  <p className="mt-1.5 text-[13px] font-medium text-foreground">{s.t}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>

            <div className="mx-auto mt-10 flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/apply"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-8 py-4 text-[15px] font-medium text-background transition-all hover:shadow-[0_0_50px_-8px_rgba(255,255,255,0.5)]"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">Request Early Access</span>
                  <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  to="/trust-model"
                  className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/40 px-6 py-4 text-[14px] text-muted-foreground backdrop-blur-md transition-all hover:border-emerald/40 hover:text-foreground"
                >
                  Trust model
                  <span className="text-muted-foreground transition-colors group-hover:text-emerald">↗</span>
                </Link>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
                Devnet only · Operator-trusted (D1) · Mainnet on roadmap
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
