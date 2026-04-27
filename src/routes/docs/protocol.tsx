import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, H3, P, Callout, List, Li, Code, Pre } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/protocol")({
  component: ProtocolDocs,
});

function ProtocolDocs() {
  return (
    <DocsLayout
      title="ZK Protocol"
      description="The circuit, the ceremony, and the cryptographic primitives behind every transfer."
    >
      <H2>The transfer circuit</H2>
      <P>
        Every confidential transfer is backed by a Groth16 zk-SNARK over the BN254 elliptic curve.
        The circuit is defined in <Code>transfer.circom</Code> and currently has approximately:
      </P>
      <List>
        <Li>
          <strong>5,914</strong> R1CS constraints
        </Li>
        <Li>
          <strong>~1.2 seconds</strong> proving time on commodity hardware
        </Li>
        <Li>
          <strong>~25 milliseconds</strong> verification time via snarkjs
        </Li>
      </List>
      <P>
        The circuit proves, in plain English:{" "}
        <em>
          "I know an owner secret, a value, and a recipient fingerprint whose Poseidon hash equals
          this public commitment, and the value is non-negative and within range."
        </em>{" "}
        — without revealing any of the secrets.
      </P>

      <H3>Hashing</H3>
      <P>
        ZK-friendly <strong>Poseidon</strong> hashes are used inside the circuit (commitments,
        nullifiers, Merkle path). Outside the circuit, the system also uses standard SHA-256 for
        non-ZK identifiers and content addressing.
      </P>

      <H3>Commitments and nullifiers</H3>
      <P>
        Each note has a unique <Code>commitment</Code> (Poseidon hash of the secret + value +
        recipient) and a unique <Code>nullifier</Code> derived from the secret. Spending a note
        publishes its nullifier so it cannot be spent again.
      </P>

      <H2>Trusted setup</H2>
      <Callout variant="info" title="Two phases">
        Groth16 requires a one-time trusted setup with two phases. Phase-1 is universal (one
        ceremony covers all circuits up to a size). Phase-2 is per-circuit.
      </Callout>
      <List>
        <Li>
          <strong>Phase-1:</strong> ZKGent uses the public <strong>Hermez powers-of-tau</strong>{" "}
          ceremony output (multi-party, 140+ contributors). Verifiable artifact, no single trusted
          party.
        </Li>
        <Li>
          <strong>Phase-2:</strong> Single-party (zkgent-dev) — used for devnet only.{" "}
          <strong>Not production grade.</strong> A multi-party Phase-2 ceremony is planned for D3 /
          mainnet.
        </Li>
      </List>

      <H2>On-chain anchoring (Solana devnet)</H2>
      <P>
        Settled transfers post a <Code>SPL Memo</Code> transaction on Solana devnet containing the
        proof identifier and a content hash. This makes the existence of the settlement publicly
        verifiable on a public chain — even though the value, sender, and recipient remain hidden.
      </P>
      <P>
        The settlement record on the operator side links back to the Solana transaction signature,
        so any party with a valid view of the proof can locate it on-chain.
      </P>

      <H2>Independent verification</H2>
      <P>Anyone can re-verify any proof produced by ZKGent — no operator trust required:</P>
      <Pre lang="bash">{`curl https://YOUR_HOST/api/zk/proofs/PROOF_ID/verify`}</Pre>
      <P>
        The endpoint loads the proof artifact and the public verification key (also available at{" "}
        <Code>GET /api/zk/keys</Code>) and runs snarkjs verification from scratch. The DB is not
        trusted in the answer — only the artifact bytes and the verification key.
      </P>

      <H2>Operator key set</H2>
      <P>
        The operator publishes fingerprints of all keys it uses (prover public key, settlement
        signing key, etc.) at <Code>GET /api/zk/keys</Code>. No secret material is ever exposed by
        the API.
      </P>

      <Callout variant="warn" title="Known limitations (D1)">
        See{" "}
        <Link to="/docs/trust" className="text-yellow-300 underline-offset-4 hover:underline">
          Trust Model
        </Link>{" "}
        for the full list of trust assumptions still present in D1: operator-side proving,
        operator-held note encryption keys, off-chain Merkle / nullifier state.
      </Callout>
    </DocsLayout>
  );
}
