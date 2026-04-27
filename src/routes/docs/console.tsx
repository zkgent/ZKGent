import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, H3, P, Callout, List, Li, Code } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/console")({
  component: ConsoleDocs,
});

function ConsoleDocs() {
  return (
    <DocsLayout
      title="Operator Console"
      description="A guided tour of every screen in the ZKGent workspace."
    >
      <Callout variant="info">
        All product screens require an approved early-access application with a linked Solana
        wallet. See the{" "}
        <Link to="/docs/quickstart" className="text-cyan hover:underline">
          Quickstart
        </Link>{" "}
        if you have not gone through that flow yet.
      </Callout>

      <H2>Dashboard</H2>
      <P>The dashboard is your control surface. It surfaces:</P>
      <List>
        <Li>Recent confidential settlements (with explorer links).</Li>
        <Li>
          Live status of the cryptographic stack — proof system, ceremony provenance, verifier.
        </Li>
        <Li>Solana network status and operator address balance (devnet).</Li>
        <Li>Per-wallet activity scoped to your linked wallet — you only see your own data.</Li>
      </List>

      <H2>Transfers</H2>
      <P>Send a one-off confidential transfer to a counterparty. The transfer flow:</P>
      <List>
        <Li>Pick a counterparty (or add one).</Li>
        <Li>Enter value and asset (USDC default).</Li>
        <Li>Optional memo — encrypted, never on-chain.</Li>
        <Li>Submit — system generates Groth16 proof, verifies, anchors on-chain.</Li>
      </List>
      <P>
        Each row in the transfers table shows status, proof ID, and Solana signature. Click into a
        transfer to re-verify the proof.
      </P>

      <H2>Payroll</H2>
      <P>
        Bundle multiple recipients into a single payroll batch. Useful for recurring payouts. Each
        recipient gets their own proof + settlement, but you operate on the batch as a unit.
      </P>
      <List>
        <Li>Create a batch with N recipients and amounts.</Li>
        <Li>Schedule or run immediately.</Li>
        <Li>Track per-recipient status — completed, pending, failed.</Li>
      </List>

      <H2>Treasury</H2>
      <P>
        Define <strong>treasury routes</strong> — named flows that move value between internal
        accounts. Useful for operational segregation (operating treasury → payroll wallet → reserve,
        etc.).
      </P>

      <H2>Counterparties</H2>
      <P>
        Your address book. Counterparties are stored under your wallet scope only. Each counterparty
        has a fingerprint that is committed inside ZK proofs without being revealed publicly.
      </P>

      <H2>Activity</H2>
      <P>
        A unified, append-only event feed: every transfer, payroll run, treasury route execution,
        settlement event, and admin action that touched your scope. Useful for audit and for
        incident review.
      </P>

      <H2>Settings</H2>
      <P>
        Light settings — currently mostly informational. Network selection (configured for devnet in
        our reference deployment during D1), display preferences, and links to your linked wallet
        metadata. If you self-host, verify your <Code>SOLANA_NETWORK</Code> env var matches your
        intended target.
      </P>

      <H3>Header trust banner</H3>
      <P>
        Above every product screen, a yellow banner reminds you that you are on devnet alpha with
        the D1 trust model. Click <strong>Trust model →</strong> to open the full explanation. This
        banner is intentionally non-dismissable until D2 ships.
      </P>
    </DocsLayout>
  );
}
