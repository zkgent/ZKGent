import { motion } from "framer-motion";

const lines = [
  "Privacy is not opacity.",
  "Confidentiality is the prerequisite of real financial systems.",
  "Trust should come from mathematics — not exposure.",
  "The next era of payments will be private and verifiable.",
];

export function Manifesto() {
  return (
    <section className="relative overflow-hidden py-40 lg:py-56">
      {/* Animated background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[700px] w-[1400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/[0.06] blur-[140px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/4 top-1/2 h-[400px] w-[500px] -translate-y-1/2 rounded-full bg-violet/[0.05] blur-[100px]"
          animate={{ x: [0, 60, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-grain opacity-[0.3]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 inline-flex items-center gap-2"
        >
          <span className="h-px w-8 bg-emerald/60" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald">Manifesto</span>
          <span className="h-px w-8 bg-emerald/60" />
        </motion.div>

        <div className="space-y-8">
          {lines.map((line, i) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 1.1, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance font-display text-3xl leading-[1.1] text-foreground sm:text-5xl lg:text-[64px]"
            >
              {i % 2 === 1 ? <em className="italic text-muted-foreground">{line}</em> : line}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
