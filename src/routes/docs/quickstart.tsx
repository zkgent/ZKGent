import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, H3, P, Callout, List, Li, Code, Pre } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/quickstart")({
  component: Quickstart,
});

function Quickstart() {
  return (
    <DocsLayout
      title="Quickstart"
      description="From zero to your first confidential transfer in five steps."
    >
      <Callout variant="info" title="Approximate time">
        Filling the application takes about 5 minutes. Approval typically takes 5–7 business days. Once approved,
        connecting your wallet and sending the first transfer takes under 2 minutes.
      </Callout>

      <H2>1. Apply for early access</H2>
      <P>
        Go to <Link to="/apply" className="text-emerald hover:underline">/apply</Link> and complete the four-step
        form. The information helps us understand who you are, what you intend to use ZKGent for, and how sensitive
        your payment flows are. Everything is reviewed by hand by the core team.
      </P>
      <P>
        At the last step you can optionally connect your Solana wallet to pre-link it to the application. If you
        skip this, you can link a wallet later from the status page.
      </P>

      <H2>2. Wait for review</H2>
      <P>
        We aim to respond within 5–7 business days. You can check your application status at any time at{" "}
        <Link to="/submitted" className="text-emerald hover:underline">/submitted</Link> from the same browser
        you applied with.
      </P>
      <P>
        Possible outcomes: <Code>under_review</Code> (still being looked at), <Code>qualified</Code> /{" "}
        <Code>pilot_candidate</Code> / <Code>contacted</Code> (approved — access granted), or{" "}
        <Code>rejected</Code> (not approved for this cohort).
      </P>

      <H2>3. Connect your Solana wallet</H2>
      <P>
        ZKGent supports the major Solana wallets: <strong>Phantom</strong>, <strong>Backpack</strong>, and{" "}
        <strong>Solflare</strong>. Click the wallet button in the header and approve the connection in your wallet
        extension.
      </P>
      <Callout variant="warn" title="Use a devnet wallet">
        Our hosted ZKGent deployment runs on Solana devnet only during D1. Use a wallet (or a separate wallet
        profile) that does not hold any mainnet funds. You can fund a devnet wallet with the Solana faucet. If you
        are self-hosting, double-check the <Code>SOLANA_NETWORK</Code> env var on your server before connecting a
        funded wallet.
      </Callout>

      <H2>4. Link the wallet to your application</H2>
      <P>
        Once you visit any product page (Dashboard, Transfers, Payroll, Treasury, Counterparties, Activity), the
        access gate will detect your application and offer to link the connected wallet. Click <strong>Link wallet</strong>{" "}
        and you are in.
      </P>
      <P>
        You can also do this from the status page at <Link to="/submitted" className="text-emerald hover:underline">/submitted</Link>{" "}
        — useful if you applied on one device and want to connect a wallet on another.
      </P>
      <Callout variant="info" title="One application, one wallet">
        Each application can be linked to exactly one wallet, and each wallet can only be linked to one application.
        This pairing is enforced at the database layer.
      </Callout>

      <H2>5. Send your first confidential transfer</H2>
      <P>
        Open <strong>Transfers</strong>, click <strong>New Transfer</strong>, choose a recipient (or add a new
        counterparty), enter the value, and submit. Behind the scenes:
      </P>
      <List>
        <Li>The system generates a Groth16 proof that your transfer is valid (~1.2s).</Li>
        <Li>The proof is verified server-side (~25ms).</Li>
        <Li>A memo transaction is posted on Solana devnet anchoring the settlement.</Li>
        <Li>You receive the on-chain signature and a link to Solana Explorer.</Li>
      </List>

      <H3>Verifying a proof yourself</H3>
      <P>
        Every proof is independently re-verifiable. Take any proof ID from your activity feed and call:
      </P>
      <Pre lang="bash">{`curl https://YOUR_HOST/api/zk/proofs/PROOF_ID/verify`}</Pre>
      <P>
        The endpoint runs snarkjs verification from scratch using only the proof artifact and the public verification
        key — no DB state is trusted in the answer.
      </P>

      <H2>What's next</H2>
      <List>
        <Li>
          <Link to="/docs/console" className="text-emerald hover:underline">Operator Console guide</Link> — payroll
          batches, treasury routes, counterparties, and the activity feed.
        </Li>
        <Li>
          <Link to="/docs/api" className="text-emerald hover:underline">API Reference</Link> — drive the system
          from your own backend.
        </Li>
        <Li>
          <Link to="/docs/protocol" className="text-emerald hover:underline">ZK Protocol</Link> — what is actually
          being proven.
        </Li>
      </List>
    </DocsLayout>
  );
}
