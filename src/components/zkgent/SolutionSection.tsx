import { motion } from "framer-motion";
import { SectionHeader } from "./Section";

export function SolutionSection() {
  return (
    <section className="relative py-32 lg:py-40">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="The protocol"
          title={
            <>
              A confidential layer for{" "}
              <em className="italic text-gradient-emerald">programmable money.</em>
            </>
          }
          description="ZKGENT separates what the network must know to settle from what counterparties must reveal. Settlement happens. Surveillance doesn't."
          align="center"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <ArchitectureDiagram />
        </motion.div>
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="relative rounded-3xl border border-hairline bg-surface/40 p-6 backdrop-blur-xl sm:p-10">
      {/* Glow border */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald/10 via-transparent to-violet/10 opacity-60" />
      </div>

      <svg viewBox="0 0 800 460" className="relative w-full">
        <defs>
          <linearGradient id="flow" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0" />
            <stop offset="50%" stopColor="oklch(0.78 0.16 160)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="oklch(0.82 0.12 200)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="layer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(1 0 0 / 6%)" />
            <stop offset="100%" stopColor="oklch(1 0 0 / 1%)" />
          </linearGradient>
          <filter id="g">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sender */}
        <g>
          <rect
            x="40"
            y="40"
            width="180"
            height="90"
            rx="12"
            fill="url(#layer)"
            stroke="oklch(1 0 0 / 12%)"
          />
          <text
            x="60"
            y="68"
            fontSize="10"
            fontFamily="JetBrains Mono"
            letterSpacing="2"
            fill="oklch(0.62 0.012 260)"
          >
            SENDER
          </text>
          <text
            x="60"
            y="98"
            fontSize="14"
            fontFamily="Inter"
            fontWeight="500"
            fill="oklch(0.985 0.002 240)"
          >
            Hidden identity
          </text>
          <circle cx="195" cy="65" r="4" fill="oklch(0.78 0.16 160)" filter="url(#g)" />
        </g>

        {/* Receiver */}
        <g>
          <rect
            x="580"
            y="40"
            width="180"
            height="90"
            rx="12"
            fill="url(#layer)"
            stroke="oklch(1 0 0 / 12%)"
          />
          <text
            x="600"
            y="68"
            fontSize="10"
            fontFamily="JetBrains Mono"
            letterSpacing="2"
            fill="oklch(0.62 0.012 260)"
          >
            RECEIVER
          </text>
          <text
            x="600"
            y="98"
            fontSize="14"
            fontFamily="Inter"
            fontWeight="500"
            fill="oklch(0.985 0.002 240)"
          >
            Hidden identity
          </text>
          <circle cx="735" cy="65" r="4" fill="oklch(0.82 0.12 200)" filter="url(#g)" />
        </g>

        {/* Amount badge floating */}
        <g>
          <rect
            x="340"
            y="40"
            width="120"
            height="40"
            rx="20"
            fill="oklch(0.13 0.005 260)"
            stroke="oklch(0.7 0.18 295 / 40%)"
          />
          <text
            x="400"
            y="65"
            textAnchor="middle"
            fontSize="11"
            fontFamily="JetBrains Mono"
            letterSpacing="2"
            fill="oklch(0.7 0.18 295)"
          >
            amount: ████
          </text>
        </g>

        {/* Flow lines to ZK layer */}
        <motion.path
          d="M 220 85 Q 300 85 320 180"
          stroke="url(#flow)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />
        <motion.path
          d="M 580 85 Q 500 85 480 180"
          stroke="url(#flow)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.5 }}
        />
        <motion.path
          d="M 400 80 L 400 180"
          stroke="url(#flow)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.7 }}
        />

        {/* ZK Verification Layer */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <rect
            x="200"
            y="180"
            width="400"
            height="100"
            rx="16"
            fill="oklch(0.78 0.16 160 / 6%)"
            stroke="oklch(0.78 0.16 160 / 40%)"
          />
          <text
            x="225"
            y="208"
            fontSize="10"
            fontFamily="JetBrains Mono"
            letterSpacing="2"
            fill="oklch(0.78 0.16 160)"
          >
            ZK VERIFICATION LAYER
          </text>
          <text
            x="225"
            y="240"
            fontSize="18"
            fontFamily="Instrument Serif"
            fontStyle="italic"
            fill="oklch(0.985 0.002 240)"
          >
            prove without revealing
          </text>
          <text x="225" y="262" fontSize="12" fontFamily="Inter" fill="oklch(0.62 0.012 260)">
            Validity, balance, and authorization — verified in zero knowledge.
          </text>

          {/* Verification dots animated */}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.circle
              key={i}
              cx={520 + i * 14}
              cy={210}
              r="3"
              fill="oklch(0.78 0.16 160)"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.g>

        {/* Connection to Solana */}
        <motion.path
          d="M 400 280 L 400 340"
          stroke="url(#flow)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 1.2 }}
        />

        {/* Solana settlement */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <rect
            x="120"
            y="340"
            width="560"
            height="80"
            rx="14"
            fill="url(#layer)"
            stroke="oklch(0.82 0.12 200 / 35%)"
          />
          <text
            x="145"
            y="368"
            fontSize="10"
            fontFamily="JetBrains Mono"
            letterSpacing="2"
            fill="oklch(0.82 0.12 200)"
          >
            SOLANA SETTLEMENT LAYER
          </text>
          <text
            x="145"
            y="396"
            fontSize="14"
            fontFamily="Inter"
            fontWeight="500"
            fill="oklch(0.985 0.002 240)"
          >
            Sub-second finality · low fees · global liquidity
          </text>
          {/* Pulse */}
          <motion.circle
            cx="660"
            cy="380"
            r="6"
            fill="oklch(0.82 0.12 200)"
            filter="url(#g)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.g>
      </svg>
    </div>
  );
}
