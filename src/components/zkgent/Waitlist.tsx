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
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-elevated/70 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Workspace available now
              </span>
            </div>

            <h2 className="mt-7 text-balance font-display text-4xl leading-[1] tracking-tight text-foreground sm:text-5xl lg:text-[60px]">
              Enter the <em className="italic text-gradient-emerald">confidential</em> console.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-muted-foreground">
              A full operator workspace for confidential payments on Solana. Transfers, payroll, treasury, and counterparty management — in one place.
            </p>

            <div className="mx-auto mt-10 flex flex-col items-center gap-4">
              <Link
                to="/dashboard"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-8 py-4 text-[15px] font-medium text-background transition-all hover:shadow-[0_0_50px_-8px_rgba(255,255,255,0.5)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Launch Workspace</span>
                <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
                No signup required · Open console directly
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
