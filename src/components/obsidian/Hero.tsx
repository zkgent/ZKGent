import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ProtocolVisual } from "./ProtocolVisual";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={ref}
      id="top"
      className="relative overflow-hidden pt-32 pb-40 lg:pt-44 lg:pb-48"
    >
      {/* ── Layered backgrounds ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 -z-30 bg-grid mask-radial-fade" />
      <div className="pointer-events-none absolute inset-0 -z-30 bg-grain opacity-[0.35]" />

      {/* Deep ambient color wash */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-20 h-[760px] w-[1400px] -translate-x-1/2 rounded-full bg-emerald/[0.09] blur-[140px]" />
      <div className="pointer-events-none absolute top-32 right-[-10%] -z-20 h-[520px] w-[520px] rounded-full bg-violet/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-[-10%] -z-20 h-[480px] w-[480px] rounded-full bg-cyan/[0.10] blur-[120px]" />

      {/* Subtle horizon line at the bottom edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px divider-gradient" />

      {/* Foreground blur layer — sits on top of everything but text, gives depth */}
      <div className="pointer-events-none absolute -bottom-32 left-1/2 z-10 h-[260px] w-[120%] -translate-x-1/2 rounded-[100%] bg-background/40 blur-3xl" />

      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-20 px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12"
      >
        {/* ── Left: copy ─────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Pre-headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-emerald/60" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-muted-foreground">
              Zero-Knowledge Confidential Payments
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-balance font-display text-[48px] leading-[0.96] tracking-tight text-foreground sm:text-[64px] lg:text-[80px]"
          >
            <span className="block">Confidential payments,</span>
            <span className="block">
              <em className="italic text-gradient-emerald">engineered</em> for{" "}
              <span className="relative inline-block">
                Solana
                <svg
                  className="absolute -bottom-3 left-0 w-full"
                  viewBox="0 0 200 8"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M0,4 Q50,0 100,4 T200,4"
                    stroke="oklch(0.78 0.16 160 / 65%)"
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.6, delay: 1, ease: "easeInOut" }}
                  />
                </svg>
              </span>
              .
            </span>
          </motion.h1>

          {/* Supporting paragraph — sharpened */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-7 max-w-md text-[17px] leading-relaxed text-muted-foreground"
          >
            Private by design. Verifiable by mathematics. Settled at Solana speed.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <a
              href="#waitlist"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition-all hover:shadow-[0_0_50px_-8px_rgba(255,255,255,0.45)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Request Early Access</span>
              <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="#architecture"
              className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/40 px-6 py-3.5 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:border-emerald/40 hover:bg-surface"
            >
              Explore the Protocol
              <span className="text-muted-foreground transition-colors group-hover:text-emerald">
                ↗
              </span>
            </a>
          </motion.div>

          {/* Premium micro-credibility strip */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-12 max-w-lg"
          >
            <div className="glass relative overflow-hidden rounded-2xl p-1.5">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald/[0.06] via-transparent to-violet/[0.06]" />
              <div className="relative grid grid-cols-3 divide-x divide-hairline">
                <CredItem dot="emerald" label="Sender" value="hidden" />
                <CredItem dot="cyan" label="Receiver" value="hidden" />
                <CredItem dot="violet" label="Amount" value="hidden" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              <span className="h-1 w-1 rounded-full bg-emerald" />
              Built on Solana · Verifiable via ZK proofs
            </div>
          </motion.div>
        </div>

        {/* ── Right: visual ──────────────────────────────────────────────── */}
        <motion.div
          style={{ y: visualY }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          {/* Extra ambient glow behind visual */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[110%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/[0.08] blur-[120px]" />
          </div>

          <ProtocolVisual />
        </motion.div>
      </motion.div>
    </section>
  );
}

function CredItem({
  dot,
  label,
  value,
}: {
  dot: "emerald" | "cyan" | "violet";
  label: string;
  value: string;
}) {
  const cls =
    dot === "emerald" ? "bg-emerald" : dot === "cyan" ? "bg-cyan" : "bg-violet";
  const glow =
    dot === "emerald"
      ? "shadow-[0_0_12px_var(--emerald-glow)]"
      : dot === "cyan"
        ? "shadow-[0_0_12px_var(--cyan-glow)]"
        : "shadow-[0_0_12px_var(--violet-glow)]";
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-3.5">
      <span className={`h-1.5 w-1.5 rounded-full ${cls} ${glow}`} />
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-base italic text-foreground/90">{value}</span>
    </div>
  );
}
