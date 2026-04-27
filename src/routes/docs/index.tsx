import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, H3, P, Callout, List, Li, Code } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/")({
  component: DocsOverview,
});

function DocsOverview() {
  return (
    <DocsLayout
      title="Welcome to ZKGent"
      description="A confidential payments operator console for Solana — built on real zero-knowledge proofs."
    >
      <Callout variant="warn" title="Devnet alpha · D1 trust model">
        ZKGent is currently in invitation-only early access on Solana devnet. The operator can still
        see plaintext values (D1). Do not use mainnet funds. See the{" "}
        <Link to="/docs/trust" className="text-yellow-300 underline-offset-4 hover:underline">
          trust model
        </Link>{" "}
        for the full picture.
      </Callout>

      <H2>What ZKGent is</H2>
      <P>
        ZKGent is an operator workspace for sending and managing{" "}
        <strong>confidential payments</strong> on Solana. Transfer values, recipients, and metadata
        are hidden inside zero-knowledge commitments, while settlements are anchored on Solana
        devnet so anyone can verify they happened — without seeing what they were.
      </P>
      <P>
        The console covers the full payment lifecycle: ad-hoc transfers, recurring payroll batches,
        treasury routing, counterparty management, and a unified activity feed.
      </P>

      <H2>What is shipped today (D1)</H2>
      <List>
        <Li>
          <strong>Real Groth16 zk-SNARK</strong> transfer circuit — 5,914 R1CS constraints over
          BN254 with Poseidon hashing. Proofs generated in ~1.2s, verified in ~25ms via snarkjs.
        </Li>
        <Li>
          <strong>Trusted setup</strong> — Phase-1 powers-of-tau from the Hermez ceremony (140+
          contributors), Phase-2 performed by zkgent-dev for devnet only.
        </Li>
        <Li>
          <strong>On-chain anchoring</strong> — every settlement posts a memo transaction on Solana
          devnet so the existence of the transfer is publicly verifiable.
        </Li>
        <Li>
          <strong>Independent re-verification</strong> — anyone can re-verify a proof via{" "}
          <Code>GET /api/zk/proofs/:id/verify</Code>, no database trust required.
        </Li>
        <Li>
          <strong>Wallet-bound access control</strong> — the product surface is gated behind an
          approved early-access application linked to a Solana wallet.
        </Li>
      </List>

      <H2>Who this is for</H2>
      <P>
        Payment operators, fintech teams, OTC desks, payroll providers, and other businesses that
        need to move value on a public chain without leaking commercial details to the entire world.
        ZKGent is also designed to be legible to investors and regulators — the trust model and
        roadmap are public so trade-offs are clear before anyone signs up.
      </P>

      <H2>Where to go next</H2>
      <List>
        <Li>
          <Link to="/docs/quickstart" className="text-emerald hover:underline">
            Quickstart
          </Link>{" "}
          — apply, get approved, link your wallet, send your first confidential transfer.
        </Li>
        <Li>
          <Link to="/docs/trust" className="text-emerald hover:underline">
            Trust Model
          </Link>{" "}
          — what we trust today (D1) and how we are removing those assumptions (D2, D3).
        </Li>
        <Li>
          <Link to="/docs/protocol" className="text-emerald hover:underline">
            ZK Protocol
          </Link>{" "}
          — the circuit, the ceremony, and the cryptographic primitives.
        </Li>
        <Li>
          <Link to="/docs/api" className="text-emerald hover:underline">
            API Reference
          </Link>{" "}
          — call the system directly from your own backend.
        </Li>
      </List>

      <H3>Open & honest by design</H3>
      <P>
        We publish what is real and what is still trusted, in plain language. If something looks
        unclear or wrong in these docs, that is a bug — please tell us at the contact in{" "}
        <Link to="/docs/faq" className="text-emerald hover:underline">
          FAQ
        </Link>
        .
      </P>
    </DocsLayout>
  );
}
