import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/architecture")({
  component: ArchitectureWrapper,
});

const LAYERS = [
  {
    id: "L1",
    name: "Confidential Notes",
    subtitle: "Value commitment layer",
    status: "Pilot scope",
    state: "pilot",
    description: "Transactions are represented as UTXO-style commitments — cryptographic notes that encode value without revealing it. Spending a note proves ownership without disclosing the amount or counterparty.",
    specs: ["Pedersen commitment scheme", "UTXO note model", "Nullifier-based spend detection", "Note encryption for recipients"],
  },
  {
    id: "L2",
    name: "ZK Proof Engine",
    subtitle: "On-chain verification",
    status: "In setup",
    state: "setup",
    description: "Every transfer is accompanied by a zero-knowledge proof that validates the transaction's correctness — sender has sufficient balance, receiver gets the stated amount — without revealing either on-chain.",
    specs: ["Groth16 proof system", "Solana BPF verifier program", "Sub-second proof verification", "Proof aggregation planned"],
  },
  {
    id: "L3",
    name: "Settlement Layer",
    subtitle: "Solana finality",
    status: "In setup",
    state: "setup",
    description: "Settlement occurs directly on Solana. Shielded note transitions are written to the ledger. The public record contains only the proof validity — not who sent what to whom or for how much.",
    specs: ["Solana BPF runtime", "~400ms finality", "Sub-cent transaction cost", "USDC and SOL support"],
  },
  {
    id: "L4",
    name: "Policy Controls",
    subtitle: "Disclosure and compliance",
    status: "Planned",
    state: "planned",
    description: "Organizations can register audit keys and define disclosure policies. Compliance officers can decrypt transaction records using authorized keys, while counterparties and the public see nothing.",
    specs: ["Selective disclosure keys", "Audit role management", "Policy inheritance by batch", "Regulator gateway (planned)"],
  },
  {
    id: "L5",
    name: "Audit Surface",
    subtitle: "Authorized inspection",
    status: "Planned",
    state: "planned",
    description: "A dedicated interface for compliance teams to inspect transfers, generate audit trails, and produce regulatory reports — without exposing confidential data to unauthorized parties.",
    specs: ["Audit key decryption", "Report export (CSV / PDF)", "Transaction attestation", "Third-party auditor access (planned)"],
  },
];

const STATE_META: Record<string, { dot: string; text: string; border: string }> = {
  pilot: { dot: "bg-emerald", text: "text-emerald", border: "border-emerald/20" },
  setup: { dot: "bg-cyan", text: "text-cyan", border: "border-cyan/20" },
  planned: { dot: "bg-muted-foreground/30", text: "text-muted-foreground/60", border: "border-hairline" },
};

const PRIVACY_PROPERTIES = [
  { label: "Sender identity", protection: "Hidden", protocol: "Note ownership proof", state: "emerald" },
  { label: "Receiver identity", protection: "Hidden", protocol: "Encrypted recipient field", state: "emerald" },
  { label: "Transaction amount", protection: "Hidden", protocol: "Pedersen commitment", state: "emerald" },
  { label: "Proof validity", protection: "Public", protocol: "On-chain Groth16 verify", state: "cyan" },
  { label: "Settlement finality", protection: "Public", protocol: "Solana ledger write", state: "cyan" },
  { label: "Audit disclosure", protection: "Authorized only", protocol: "Selective key decryption", state: "violet" },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

function ArchitecturePage() {
  return (
    <div className="min-h-full bg-background px-5 py-8 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

          <motion.div variants={item}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">System</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Architecture</h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              OBSIDIAN is a layered confidential payment system. Each layer has a defined role — from cryptographic commitment through settlement and compliance.
            </p>
          </motion.div>

          {/* Privacy table */}
          <motion.div variants={item} className="rounded-2xl border border-hairline bg-surface p-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Privacy Properties</p>
            <div className="space-y-0">
              {PRIVACY_PROPERTIES.map((p) => {
                const col = p.state === "emerald" ? "text-emerald" : p.state === "cyan" ? "text-cyan" : "text-violet";
                const dot = p.state === "emerald" ? "bg-emerald" : p.state === "cyan" ? "bg-cyan" : "bg-violet";
                return (
                  <div key={p.label} className="grid grid-cols-[1fr_auto_1fr] gap-4 py-3 border-b border-hairline last:border-0 items-center">
                    <span className="text-[13px] text-foreground">{p.label}</span>
                    <div className={`flex items-center gap-1.5 justify-center`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${col}`}>{p.protection}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground text-right">{p.protocol}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Layer stack */}
          <motion.div variants={item}>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Protocol Layers</p>
            <div className="space-y-3">
              {LAYERS.map((layer, i) => {
                const meta = STATE_META[layer.state];
                return (
                  <motion.div key={layer.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={`rounded-2xl border bg-surface p-5 ${meta.border}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground/50">{layer.id}</span>
                            <h3 className="text-[15px] font-semibold text-foreground">{layer.name}</h3>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{layer.subtitle}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${meta.text}`}>{layer.status}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground mb-3 pl-5">{layer.description}</p>
                    <div className="flex flex-wrap gap-2 pl-5">
                      {layer.specs.map((spec) => (
                        <span key={spec} className="rounded-full border border-hairline bg-surface-elevated px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Integrity note */}
          <motion.div variants={item}
            className="rounded-2xl border border-hairline bg-surface p-5 flex items-start gap-4">
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
            <div>
              <p className="text-[13px] font-semibold text-foreground mb-1">Verifiability without exposure</p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                OBSIDIAN does not rely on trusted hardware or off-chain relayers for privacy. Every transaction's validity is cryptographically proven and can be verified by any participant — without learning anything about the transfer itself. The protocol is designed for production-grade confidentiality in regulated environments.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function ArchitectureWrapper() {
  return <AppShell><ArchitecturePage /></AppShell>;
}

export default ArchitectureWrapper;
