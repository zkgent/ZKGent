import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, H3, P, Callout, List, Li, Code, Pre } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/api")({
  component: ApiDocs,
});

function ApiDocs() {
  return (
    <DocsLayout
      title="API Reference"
      description="HTTP endpoints for applications, access control, ZK proofs, and on-chain settlements."
    >
      <Callout variant="info" title="Base URL">
        All endpoints are served at <Code>https://YOUR_HOST/api/*</Code>. In development:{" "}
        <Code>http://localhost:3001/api/*</Code> (proxied through Vite at port 5000).
      </Callout>

      <H2>Authentication</H2>
      <P>
        Most endpoints are public reads. Wallet-gated write endpoints (transfers initiation,
        transaction prepare) require an approved early-access wallet, supplied via the{" "}
        <Code>x-wallet-address</Code> header.
      </P>
      <Callout variant="warn" title="D1 limitation">
        The wallet header is unsigned. This is a soft cohort gate consistent with the D1 trust model
        — full signature challenge-response ships with D2 (client-side proving).
      </Callout>

      <H2>Applications</H2>

      <H3>POST /api/applications</H3>
      <P>Create a new early-access application.</P>
      <Pre lang="bash">{`curl -X POST https://YOUR_HOST/api/applications \\
  -H "Content-Type: application/json" \\
  -d '{
    "fullName": "Ada Lovelace",
    "workEmail": "ada@example.com",
    "company": "Analytical Engines Ltd",
    "role": "CTO",
    "useCase": "payroll",
    "teamSize": "11-50",
    "region": "EU",
    "monthlyVolume": "100k-1M",
    "currentRail": "swift",
    "privacyConcern": "competitive",
    "whyConfidential": "We pay strategic suppliers and want commercial terms hidden.",
    "walletAddress": "OPTIONAL_SOLANA_ADDRESS"
  }'`}</Pre>
      <P>
        Returns the new application with status <Code>under_review</Code>.
      </P>

      <H3>GET /api/applications/:id</H3>
      <P>Public read of a single application's status and metadata.</P>

      <H2>Access Control</H2>

      <H3>GET /api/access/check?wallet=ADDRESS</H3>
      <P>Check whether a wallet has an approved early-access application.</P>
      <Pre lang="bash">{`curl "https://YOUR_HOST/api/access/check?wallet=ABC123..."`}</Pre>
      <P>
        Returns <Code>{"{ hasAccess, reason, application }"}</Code>.
      </P>

      <H3>POST /api/access/link-wallet</H3>
      <P>Link a wallet to an existing application (one-time, atomic).</P>
      <Pre lang="bash">{`curl -X POST https://YOUR_HOST/api/access/link-wallet \\
  -H "Content-Type: application/json" \\
  -d '{ "applicationId": "APP_ID", "walletAddress": "WALLET" }'`}</Pre>
      <P>Returns 409 if the wallet is already linked to a different application.</P>

      <H2>ZK Settlements (gated)</H2>

      <H3>POST /api/zk/settlement/initiate</H3>
      <P>
        Queue a confidential settlement. Requires <Code>x-wallet-address</Code> header pointing to
        an approved wallet. The wallet you pass <em>is</em> the one the settlement is attributed to
        — body wallet fields are ignored.
      </P>
      <Pre lang="bash">{`curl -X POST https://YOUR_HOST/api/zk/settlement/initiate \\
  -H "Content-Type: application/json" \\
  -H "x-wallet-address: APPROVED_WALLET" \\
  -d '{
    "transfer_id": "TR_123",
    "value": 1000,
    "asset": "USDC",
    "recipient_fingerprint": "FP_ABC",
    "memo": "optional"
  }'`}</Pre>

      <H3>POST /api/zk/tx/prepare</H3>
      <P>
        Build the unsigned Solana transaction for a queued settlement, ready for the wallet to sign.
        Gated.
      </P>
      <Pre lang="bash">{`curl -X POST https://YOUR_HOST/api/zk/tx/prepare \\
  -H "Content-Type: application/json" \\
  -H "x-wallet-address: APPROVED_WALLET" \\
  -d '{ "settlement_id": "SET_123" }'`}</Pre>

      <H3>POST /api/zk/tx/confirm</H3>
      <P>Submit the signed-and-broadcast transaction signature back to the system.</P>

      <H2>Verification & Public Reads</H2>

      <H3>GET /api/zk/proofs/:id/verify</H3>
      <P>
        Re-verify any proof from scratch using only the proof artifact and the public verification
        key. No DB trust in the response.
      </P>
      <Pre lang="bash">{`curl https://YOUR_HOST/api/zk/proofs/PROOF_ID/verify`}</Pre>

      <H3>GET /api/zk/keys</H3>
      <P>Public key fingerprints and the prover public key. No secret material is ever exposed.</P>

      <H3>GET /api/zk/system</H3>
      <P>Cryptographic stack status — circuit, ceremony provenance, proof system version.</P>

      <H3>GET /api/zk/solana</H3>
      <P>Live Solana devnet status and operator account balance.</P>

      <H3>GET /api/zk/disclosure</H3>
      <P>Compliance disclosure status (selective-disclosure mechanism description).</P>

      <H2>Errors</H2>
      <List>
        <Li>
          <Code>401 wallet_required</Code> — gated endpoint called without a wallet header or body
          field.
        </Li>
        <Li>
          <Code>400 wallet_mismatch</Code> — header wallet differs from body wallet.
        </Li>
        <Li>
          <Code>403 access_denied</Code> — wallet has no approved application.
        </Li>
        <Li>
          <Code>404 application_not_found</Code> / <Code>404 settlement_not_found</Code>.
        </Li>
        <Li>
          <Code>409 wallet_already_linked_to_another_application</Code> — UNIQUE constraint hit.
        </Li>
      </List>

      <Callout variant="info">
        Looking for a client SDK? Not yet. For now, drive the system with raw HTTP from your
        backend. SDK packages are on the post-D2 roadmap.
      </Callout>

      <P>
        See the{" "}
        <Link to="/docs/protocol" className="text-emerald hover:underline">
          ZK Protocol
        </Link>{" "}
        page for what each proof actually proves, and the{" "}
        <Link to="/docs/trust" className="text-emerald hover:underline">
          Trust Model
        </Link>{" "}
        for the assumptions behind the verifier.
      </P>
    </DocsLayout>
  );
}
