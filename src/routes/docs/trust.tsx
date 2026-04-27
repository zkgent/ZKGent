import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, H3, P, Callout, List, Li, Code } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/trust")({
  component: TrustDocs,
});

function TrustDocs() {
  return (
    <DocsLayout
      title="Trust Model"
      description="What you trust today, and how we are removing those assumptions."
    >
      <P>
        Confidential payment systems are only as strong as the assumptions you understand. ZKGent is being built in
        the open across three honest milestones — D1, D2, D3 — each removing more trust from the operator and
        moving more guarantees onto math and Solana.
      </P>
      <P>
        For the live, canonical roadmap with status colors, see the public{" "}
        <Link to="/trust-model" className="text-emerald hover:underline">trust model page</Link>.
      </P>

      <H2>D1 — Operator-trusted (current)</H2>
      <Callout variant="ok" title="Active">
        This is what you are using today. Live on Solana devnet only.
      </Callout>
      <P>What is real:</P>
      <List>
        <Li>Real Groth16 zk-SNARK transfer circuit (~5,914 R1CS, BN254 curve, Poseidon hashing).</Li>
        <Li>Phase-1 trusted setup: Hermez powers-of-tau ceremony (multi-party, 140+ contributors).</Li>
        <Li>Phase-2 trusted setup: single-party (zkgent-dev) — devnet only, NOT production-grade.</Li>
        <Li>Settlements anchored on Solana devnet via SPL Memo program.</Li>
        <Li>
          Independent re-verification available at <Code>GET /api/zk/proofs/:id/verify</Code> — anyone can
          re-prove any proof without trusting the DB.
        </Li>
      </List>
      <P>What is still trusted:</P>
      <List>
        <Li>
          <strong>Operator can see plaintext.</strong> Witness generation and proving currently happen
          server-side. The operator therefore holds the values, the recipient identity, and the owner secret.
        </Li>
        <Li>
          <strong>Operator-controlled note encryption.</strong> Notes are encrypted at rest, but with operator-held
          keys.
        </Li>
        <Li>
          <strong>Off-chain Merkle / nullifier state.</strong> The commitment tree and nullifier set live in the
          operator database. There is no on-chain enforcement yet.
        </Li>
      </List>

      <H2>D2 — Client-side proving (in progress)</H2>
      <P>
        Move Groth16 witness generation and proving into the user's browser. The owner secret never leaves the
        device. Per-user encryption (X25519 / ECIES) replaces operator-held keys, so the operator can no longer
        decrypt notes. The operator becomes a relayer plus verifier — not a custodian of secrets.
      </P>

      <H2>D3 — On-chain Solana verifier (planned)</H2>
      <P>
        A Solana program that runs Groth16 verification on-chain (using Light Protocol's altbn128 syscalls), with
        on-chain Merkle tree state, on-chain nullifier set, real SPL token vault, and proper deposit / withdraw
        flows. Phase-2 trusted setup will be redone as a multi-party ceremony for production use.
      </P>

      <H2>Why publish this?</H2>
      <P>
        Many "private" payment products understate their trust assumptions. We would rather lose a sign-up than
        have a customer discover later that their threat model was wrong. If our D1 description does not match
        what you observe, that is a bug — please report it.
      </P>

      <H3>Network and asset scope</H3>
      <Callout variant="warn">
        Our hosted deployment runs on Solana <strong>devnet only</strong> during D1. <strong>No mainnet
        support.</strong> Do not deposit or operate with real funds. The <Code>SOLANA_NETWORK</Code> env var
        controls the runtime target on self-hosted deployments — verify it before connecting any funded wallet.
      </Callout>
    </DocsLayout>
  );
}
