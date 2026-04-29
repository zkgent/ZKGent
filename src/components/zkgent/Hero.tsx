import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ProtocolVisual } from "./ProtocolVisual";

const CONTRACT_ADDRESS = "9RAFhBeEihAXADgHCdHZA38xtzpc1htgJ8NZpXampump";
const SOLSCAN_URL = `https://solscan.io/token/${CONTRACT_ADDRESS}`;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} id="top" className="relative overflow-hidden pt-32 pb-40 lg:pt-44 lg:pb-48">
      <div className="pointer-events-none absolute inset-0 -z-30 bg-grid mask-radial-fade" />
      <div className="pointer-events-none absolute inset-0 -z-30 bg-grain opacity-[0.35]" />

      <div className="pointer-events-none absolute -top-40 left-1/2 -z-20 h-[760px] w-[1400px] -translate-x-1/2 rounded-full bg-emerald/[0.09] blur-[140px]" />
      <div className="pointer-events-none absolute top-32 right-[-10%] -z-20 h-[520px] w-[520px] rounded-full bg-violet/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-[-10%] -z-20 h-[480px] w-[480px] rounded-full bg-cyan/[0.10] blur-[120px]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px divider-gradient" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 z-10 h-[260px] w-[120%] -translate-x-1/2 rounded-[100%] bg-background/40 blur-3xl" />

      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-20 px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12"
      >
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3"
          >
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-emerald/60" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-muted-foreground">
              Zero-Knowledge Confidential Payments
            </span>
            <Link
              to="/trust-model"
              className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/[0.07] px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-yellow-200/90 transition hover:border-yellow-400/60 hover:text-yellow-100"
            >
              <span className="h-1 w-1 animate-pulse rounded-full bg-yellow-400" />
              Devnet alpha · D1 · Early access
            </Link>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-balance font-display text-[48px] leading-[0.96] tracking-tight text-foreground sm:text-[64px] lg:text-[80px]"
          >
            <span className="block">Confidential payments,</span>
            <span className="block">
              <em className="not-italic text-gradient-emerald font-semibold">engineered</em> for{" "}
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

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-7 max-w-md text-[17px] leading-relaxed text-muted-foreground"
          >
            Private by design. Verifiable by mathematics. Settled at Solana speed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/apply"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition-all hover:shadow-[0_0_50px_-8px_rgba(255,255,255,0.45)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Request Early Access</span>
              <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
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

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="mt-6"
          >
            <ContractAddressPill />
          </motion.div>

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

        <motion.div
          style={{ y: visualY }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[110%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/[0.08] blur-[120px]" />
          </div>

          <ProtocolVisual />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 bottom-[10%] flex items-center gap-2 glass rounded-full px-3 py-1.5 animate-float"
            style={{ animationDelay: "3s" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80">
              shielded pool · live
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function ContractAddressPill() {
  const [copied, setCopied] = useState(false);

  const truncated = `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-6)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = CONTRACT_ADDRESS;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-full border border-hairline bg-surface/40 backdrop-blur-md">
      <span aria-live="polite" className="sr-only">
        {copied ? "Contract address copied to clipboard" : ""}
      </span>
      <span className="flex items-center gap-2 border-r border-hairline px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-violet shadow-[0_0_8px_var(--violet-glow)]" />
        Contract
      </span>
      <span
        className="hidden items-center px-3.5 py-2 font-mono text-[12px] text-foreground/90 sm:flex"
        title={CONTRACT_ADDRESS}
      >
        {truncated}
      </span>
      <span
        className="flex items-center px-3.5 py-2 font-mono text-[12px] text-foreground/90 sm:hidden"
        title={CONTRACT_ADDRESS}
      >
        {`${CONTRACT_ADDRESS.slice(0, 4)}…${CONTRACT_ADDRESS.slice(-4)}`}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy contract address"
        className="group inline-flex items-center gap-1.5 border-l border-hairline px-3 py-2 text-xs text-muted-foreground transition hover:bg-emerald/10 hover:text-emerald"
      >
        {copied ? (
          <>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-emerald">Copied</span>
          </>
        ) : (
          <>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span className="hidden sm:inline">Copy</span>
          </>
        )}
      </button>
      <a
        href={SOLSCAN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View contract on Solscan"
        className="group inline-flex items-center gap-1.5 border-l border-hairline px-3 py-2 text-xs text-muted-foreground transition hover:bg-violet/10 hover:text-violet"
      >
        <span className="hidden sm:inline">Solscan</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17L17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </a>
    </div>
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
  const cls = dot === "emerald" ? "bg-emerald" : dot === "cyan" ? "bg-cyan" : "bg-violet";
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
