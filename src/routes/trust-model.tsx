import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/trust-model")({
  component: TrustModelPage,
});

type Phase = {
  id: string;
  title: string;
  status: "shipped" | "in_progress" | "planned";
  bullets: string[];
};

const PHASES: Phase[] = [
  {
    id: "D1",
    title: "D1 — Operator-trusted Groth16 (current)",
    status: "shipped",
    bullets: [
      "Real Groth16 zk-SNARK transfer circuit (~5,914 R1CS, BN254, Poseidon)",
      "Phase-1 ceremony: Hermez powersOfTau (multi-party, 140+ contributors)",
      "Phase-2 ceremony: single-party (zkgent-dev) — devnet only",
      "Settlements posted on Solana devnet via SPL Memo anchoring",
      "Independent re-verification: GET /api/zk/proofs/:id/verify",
      "Operator still sees plaintext value and owner_secret (D1 trust model)",
    ],
  },
  {
    id: "D2",
    title: "D2 — Client-side proving",
    status: "in_progress",
    bullets: [
      "Move Groth16 witness generation and proving into the browser",
      "owner_secret never leaves the user's device",
      "Per-user encryption (X25519 / ECIES) — operator can no longer decrypt notes",
      "Operator becomes a relayer + verifier, not a custodian of secrets",
    ],
  },
  {
    id: "D3",
    title: "D3 — On-chain Solana verifier",
    status: "planned",
    bullets: [
      "Solana program that runs Groth16 verify on-chain (using Light Protocol's altbn128 syscalls)",
      "On-chain Merkle tree state + nullifier set (no DB trust required)",
      "SPL token vault + real deposit / withdraw flows",
      "Multi-party phase-2 trusted setup ceremony",
    ],
  },
];

const STATUS_META: Record<Phase["status"], { label: string; dot: string; text: string; ring: string }> = {
  shipped: { label: "Active", dot: "bg-emerald", text: "text-emerald", ring: "border-emerald/30" },
  in_progress: { label: "In progress", dot: "bg-cyan", text: "text-cyan", ring: "border-cyan/30" },
  planned: { label: "Planned", dot: "bg-violet", text: "text-violet", ring: "border-violet/25" },
};

function TrustModelPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-emerald/[0.04] blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-violet/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2">
          <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
            ← Back to home
          </Link>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Trust model & roadmap
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Confidential payment systems are only as strong as the assumptions you understand.
          ZKGent is being built in the open. This page is the canonical, honest description of
          what is real today, what is still trusted, and what is coming next.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/[0.06] px-4 py-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-yellow-300">Devnet alpha · Early access</span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Mainnet is not supported. Do not deposit real funds. Access is gated to approved
          early-access participants who understand the D1 trust model below.
        </p>

        <div className="mt-12 space-y-4">
          {PHASES.map((phase) => {
            const m = STATUS_META[phase.status];
            return (
              <div key={phase.id} className={`rounded-2xl border ${m.ring} bg-surface p-6`}>
                <div className="mb-3 flex items-center gap-3">
                  <span className={`font-mono text-[11px] uppercase tracking-widest ${m.text}`}>
                    {phase.id}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-widest ${m.ring} ${m.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot} ${phase.status === "in_progress" ? "animate-pulse" : ""}`} />
                    {m.label}
                  </span>
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">{phase.title}</h2>
                <ul className="mt-3 space-y-2">
                  {phase.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-[13px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-hairline bg-surface/60 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Verify it yourself</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Every Groth16 proof produced by ZKGent can be re-verified by anyone with the public
            verification key. Pass any proof ID to{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              GET /api/zk/proofs/:id/verify
            </code>{" "}
            to run snarkjs verification from scratch. No DB state is trusted in the answer — only
            the proof artifact and the public verification key.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to="/apply"
            className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition"
          >
            Request early access →
          </Link>
          <Link
            to="/architecture"
            className="rounded-full border border-hairline px-5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition"
          >
            System architecture
          </Link>
        </div>
      </div>
    </main>
  );
}

export default TrustModelPage;
