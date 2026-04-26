import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  }

  return (
    <section id="waitlist" className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-hairline bg-surface/40 p-10 backdrop-blur-xl sm:p-16"
        >
          {/* Animated border glow */}
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

          {/* Glow ambient */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-emerald/15 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30 mask-radial-fade" />

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-elevated/70 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Now accepting early operators
              </span>
            </div>

            <h2 className="mt-7 text-balance font-display text-4xl leading-[1] tracking-tight text-foreground sm:text-5xl lg:text-[60px]">
              Be early to <em className="italic text-gradient-emerald">confidential</em> finance.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-muted-foreground">
              Get priority access to OBSIDIAN, integration support, and protocol previews.
            </p>

            <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-lg">
              <div className="group relative flex items-center gap-2 rounded-full border border-hairline bg-background/80 p-1.5 transition-all focus-within:border-emerald/40 focus-within:shadow-[0_0_40px_-10px_var(--emerald-glow)]">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={submitted}
                  className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={submitted}
                  className="group/btn relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-all hover:shadow-[0_0_30px_-6px_rgba(255,255,255,0.5)] disabled:opacity-80"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                  <span className="relative">{submitted ? "✓ Joined" : "Join Waitlist"}</span>
                  {!submitted && <span className="relative transition-transform group-hover/btn:translate-x-0.5">→</span>}
                </button>
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                For early operators, teams, and infrastructure partners.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
