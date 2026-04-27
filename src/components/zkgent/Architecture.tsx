import { motion } from "framer-motion";
import { SectionHeader } from "./Section";

const pillars = [
  {
    title: "Zero-Knowledge Verification",
    body: "Succinct proofs validate every transfer's correctness without exposing inputs. Trust shifts from disclosure to mathematics.",
    tags: ["verifiable", "sender hidden"],
  },
  {
    title: "Confidential Note Model",
    body: "Encrypted payment notes carry value between parties. Only the intended recipient can decrypt and spend.",
    tags: ["receiver hidden", "amount hidden"],
  },
  {
    title: "Private Settlement Flow",
    body: "On-chain settlement with off-chain encrypted metadata. Composable with existing Solana primitives.",
    tags: ["solana-native", "verifiable"],
  },
  {
    title: "Operational Scalability",
    body: "Designed for institutional throughput: batched proofs, predictable cost envelopes, recoverable state.",
    tags: ["solana-native", "verifiable"],
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="relative py-32 lg:py-40">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/2 h-[500px] w-[600px] -translate-y-1/2 rounded-full bg-violet/[0.05] blur-[120px]" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeader
            eyebrow="Architecture"
            title={
              <>
                A protocol stack designed for{" "}
                <em className="italic text-muted-foreground">cryptographic discretion at scale.</em>
              </>
            }
            description="Every layer of ZKGENT is built around a single principle: settlement requires verification, not exposure."
          />

          {/* Stack illustration */}
          <div className="mt-10 space-y-2">
            {[
              { label: "Application", color: "oklch(1 0 0 / 6%)" },
              { label: "Confidential Notes", color: "oklch(0.7 0.18 295 / 18%)" },
              { label: "ZK Verification", color: "oklch(0.78 0.16 160 / 22%)" },
              { label: "Solana Runtime", color: "oklch(0.82 0.12 200 / 18%)" },
            ].map((layer, i) => (
              <motion.div
                key={layer.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="group flex items-center justify-between rounded-lg border border-hairline px-4 py-3 transition-all hover:border-foreground/20"
                style={{ background: layer.color }}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/80">
                  {layer.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">L{4 - i}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface/50 p-6 backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:border-emerald/30"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-emerald/20 via-transparent to-cyan/10" />
                <div className="absolute inset-px rounded-2xl bg-surface" />
              </div>
              <div className="relative">
                <h3 className="text-[17px] font-medium leading-snug text-foreground">{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      <span className="h-1 w-1 rounded-full bg-emerald" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
