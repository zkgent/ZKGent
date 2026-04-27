import { motion } from "framer-motion";

/**
 * Custom animated protocol visualization.
 * Glowing nodes, encrypted flow paths, shielded pool, floating glass cards.
 */
export function ProtocolVisual() {
  return (
    <div className="relative aspect-square w-full max-w-[480px]">
      {/* Ambient glow layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/10 blur-[100px]" />
        <div className="absolute left-[20%] top-[30%] h-40 w-40 rounded-full bg-cyan/15 blur-[60px]" />
        <div className="absolute right-[10%] bottom-[20%] h-44 w-44 rounded-full bg-violet/15 blur-[70px]" />
      </div>

      {/* Outer pulse ring */}
      <div className="absolute inset-[6%] rounded-full border border-hairline animate-pulse-ring" />
      <div
        className="absolute inset-[18%] rounded-full border border-hairline"
        style={{ animation: "pulse-ring 3s ease-in-out infinite", animationDelay: "1s" }}
      />

      <svg viewBox="0 0 600 600" className="relative h-full w-full">
        <defs>
          <linearGradient id="line-emerald" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0" />
            <stop offset="50%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="oklch(0.82 0.12 200)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="line-cyan" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.82 0.12 200)" stopOpacity="0" />
            <stop offset="50%" stopColor="oklch(0.82 0.12 200)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.7 0.18 295)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="pool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0.5" />
            <stop offset="60%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0" />
          </radialGradient>
          <filter id="soft-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shielded pool — center */}
        <circle cx="300" cy="300" r="120" fill="url(#pool)" />
        <motion.circle
          cx="300"
          cy="300"
          r="92"
          fill="none"
          stroke="oklch(0.78 0.16 160 / 35%)"
          strokeWidth="1"
          strokeDasharray="3 6"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "300px 300px" }}
        />
        <motion.circle
          cx="300"
          cy="300"
          r="64"
          fill="none"
          stroke="oklch(0.82 0.12 200 / 30%)"
          strokeWidth="1"
          strokeDasharray="2 4"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "300px 300px" }}
        />

        {/* Center hexagon — shielded core */}
        <g filter="url(#soft-glow)">
          <polygon
            points="300,250 343,275 343,325 300,350 257,325 257,275"
            fill="oklch(0.17 0.006 260)"
            stroke="oklch(0.78 0.16 160 / 60%)"
            strokeWidth="1"
          />
          <text
            x="300"
            y="305"
            textAnchor="middle"
            fontSize="11"
            fontFamily="JetBrains Mono"
            fill="oklch(0.78 0.16 160)"
            letterSpacing="2"
          >
            ZK
          </text>
        </g>

        {/* Flow paths */}
        <g fill="none" strokeWidth="1.2">
          <path
            d="M 80 140 Q 200 200 257 290"
            stroke="url(#line-emerald)"
            strokeDasharray="4 4"
            className="animate-dash"
          />
          <path
            d="M 520 140 Q 400 200 343 290"
            stroke="url(#line-cyan)"
            strokeDasharray="4 4"
            className="animate-dash"
            style={{ animationDelay: "1.5s" }}
          />
          <path
            d="M 80 460 Q 200 420 257 320"
            stroke="url(#line-emerald)"
            strokeDasharray="4 4"
            className="animate-dash"
            style={{ animationDelay: "2.5s" }}
          />
          <path
            d="M 520 460 Q 400 420 343 320"
            stroke="url(#line-cyan)"
            strokeDasharray="4 4"
            className="animate-dash"
            style={{ animationDelay: "3.5s" }}
          />
        </g>

        {/* Outer nodes */}
        {[
          { cx: 80, cy: 140, c: "oklch(0.78 0.16 160)", d: 0 },
          { cx: 520, cy: 140, c: "oklch(0.82 0.12 200)", d: 0.3 },
          { cx: 80, cy: 460, c: "oklch(0.7 0.18 295)", d: 0.6 },
          { cx: 520, cy: 460, c: "oklch(0.78 0.16 160)", d: 0.9 },
        ].map((n, i) => (
          <g key={i}>
            <motion.circle
              cx={n.cx}
              cy={n.cy}
              r="14"
              fill="none"
              stroke={n.c}
              strokeOpacity="0.4"
              animate={{ r: [14, 22, 14], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, delay: n.d }}
            />
            <circle cx={n.cx} cy={n.cy} r="6" fill={n.c} opacity="0.9" filter="url(#soft-glow)" />
            <circle cx={n.cx} cy={n.cy} r="2.5" fill="oklch(0.985 0.002 240)" />
          </g>
        ))}

        {/* Settlement layer dotted ring */}
        <circle
          cx="300"
          cy="300"
          r="240"
          fill="none"
          stroke="oklch(1 0 0 / 6%)"
          strokeWidth="1"
          strokeDasharray="1 8"
        />
      </svg>

      {/* Floating glass labels */}
      <FloatingTag className="left-[2%] top-[12%]" delay={0.3} accent="emerald">
        sender hidden
      </FloatingTag>
      <FloatingTag className="right-[2%] top-[12%]" delay={0.55} accent="cyan">
        receiver hidden
      </FloatingTag>
      <FloatingTag className="left-1/2 -translate-x-1/2 top-[2%]" delay={0.8} accent="violet">
        amount hidden
      </FloatingTag>

      {/* Floating mini-card: proof */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-[4%] bottom-[10%] w-[180px] glass rounded-xl p-3 animate-float"
        style={{ animationDelay: "1.5s" }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          ZK Proof
        </div>
        <div className="mt-1.5 font-mono text-[11px] text-foreground">✓ verified</div>
        <div className="mt-2 grid grid-cols-8 gap-px">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-sm"
              style={{
                background: i % 5 === 0 ? "oklch(0.78 0.16 160 / 80%)" : "oklch(1 0 0 / 12%)",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FloatingTag({
  children,
  className,
  delay,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  accent: "emerald" | "cyan" | "violet";
}) {
  const dot = accent === "emerald" ? "bg-emerald" : accent === "cyan" ? "bg-cyan" : "bg-violet";
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute glass rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot} animate-pulse`} />
        {children}
      </span>
    </motion.div>
  );
}
