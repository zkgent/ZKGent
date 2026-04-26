import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ProtocolVisual } from "./ProtocolVisual";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} id="top" className="relative overflow-hidden pt-32 pb-32 lg:pt-40 lg:pb-40">
      {/* Layered backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-grid mask-radial-fade" />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-grain opacity-[0.4]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[600px] w-[1200px] -translate-x-1/2 rounded-full bg-emerald/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-violet/10 blur-[100px]" />

      <motion.div style={{ y, opacity }} className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        {/* Left */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/50 px-3 py-1 backdrop-blur-md"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Confidential payments protocol
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-balance text-[44px] font-display leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-[72px]"
          >
            Payments that <em className="italic text-gradient-emerald">prove</em>{" "}
            without <span className="relative">revealing
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
                <motion.path
                  d="M0,4 Q50,0 100,4 T200,4"
                  stroke="oklch(0.78 0.16 160 / 60%)"
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, delay: 1, ease: "easeInOut" }}
                />
              </svg>
            </span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-7 max-w-xl text-balance text-[17px] leading-relaxed text-muted-foreground"
          >
            OBSIDIAN is a zero-knowledge confidential payments protocol on Solana.
            Sender, receiver, and amount stay private — verifiability stays mathematical.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#waitlist"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:shadow-[0_0_40px_-6px_rgba(255,255,255,0.4)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Join Waitlist</span>
              <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="#vision"
              className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/40 px-5 py-3 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:border-emerald/40 hover:bg-surface"
            >
              Read the Vision
              <span className="text-muted-foreground transition-colors group-hover:text-emerald">↗</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] font-mono uppercase tracking-[0.15em] text-muted-foreground"
          >
            <Badge dot="emerald">Built on Solana</Badge>
            <span className="h-3 w-px bg-hairline" />
            <Badge dot="cyan">Zero-Knowledge Proofs</Badge>
            <span className="h-3 w-px bg-hairline" />
            <Badge dot="violet">Confidential by Default</Badge>
          </motion.div>
        </div>

        {/* Right — visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          <ProtocolVisual />
        </motion.div>
      </motion.div>
    </section>
  );
}

function Badge({ children, dot }: { children: React.ReactNode; dot: "emerald" | "cyan" | "violet" }) {
  const cls = dot === "emerald" ? "bg-emerald" : dot === "cyan" ? "bg-cyan" : "bg-violet";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-1 w-1 rounded-full ${cls}`} />
      {children}
    </span>
  );
}
