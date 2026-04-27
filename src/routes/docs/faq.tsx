import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, P, Callout } from "@/components/docs/DocsLayout";

export const Route = createFileRoute("/docs/faq")({
  component: FaqDocs,
});

function FaqDocs() {
  return (
    <DocsLayout
      title="FAQ & Security"
      description="Common questions, limitations, and how to report issues."
    >
      <H2>Why devnet only?</H2>
      <P>
        D1 is operator-trusted (the operator can see plaintext values and holds note-encryption
        keys). It would be irresponsible to accept real funds before D2 (client-side proving) ships.
        We would rather ship honestly on devnet now and earn trust by removing assumptions in
        public.
      </P>

      <H2>Can I deposit mainnet funds?</H2>
      <Callout variant="warn">
        <strong>No.</strong> ZKGent currently has no mainnet deployment. Any address claiming to be
        ZKGent on mainnet today is not us. Real-fund support arrives with D3.
      </Callout>

      <H2>What wallets are supported?</H2>
      <P>
        Phantom, Backpack, and Solflare on Solana devnet. Any standard Solana wallet that injects{" "}
        <code>window.solana</code> should work.
      </P>

      <H2>How long does application review take?</H2>
      <P>Typically 5–7 business days. Reviews are done by hand by the core team, not automated.</P>

      <H2>What if my application is rejected?</H2>
      <P>
        You will see <code>rejected</code> as the status on your application page. If your situation
        has materially changed (different team, different use case), reach out and we can
        re-evaluate.
      </P>

      <H2>Can one wallet have multiple applications?</H2>
      <P>
        No. The database enforces a one-to-one relationship between an application and a wallet —
        both directions are unique. If you need to change the wallet on file, contact us.
      </P>

      <H2>Are values, recipients, or amounts ever logged in plaintext?</H2>
      <P>
        During D1, the operator necessarily sees plaintext values during proving (proving runs
        server-side). They are not written to logs in plaintext, but they exist in operator memory
        and in operator-encrypted note storage. This is the core D1 trade-off and the primary thing
        D2 removes.
      </P>

      <H2>Is there an audit?</H2>
      <P>
        Not yet — we are still pre-D2. A formal audit will happen before D3 / mainnet. Until then,
        the circuit, the verification key, and every proof are publicly re-verifiable, and the trust
        model is stated in plain language at{" "}
        <Link to="/docs/trust" className="text-emerald hover:underline">
          /docs/trust
        </Link>
        .
      </P>

      <H2>Reporting a security issue</H2>
      <Callout variant="info" title="Responsible disclosure">
        If you find a security issue — circuit bug, server-side vulnerability, key handling problem,
        or anything else that compromises the trust model — please report it privately first. Do not
        file a public issue or post on social media. Email the core team and allow reasonable time
        for a fix before any public disclosure.
      </Callout>

      <H2>Reporting a docs bug</H2>
      <P>
        If something in these docs is unclear, wrong, or out of date, that is a bug. Please tell us.
        Honest docs are a feature, not a nice-to-have.
      </P>

      <H2>Open-source status</H2>
      <P>
        Parts of the ZK pipeline (circuit, prover scripts, verifier) are intended to be open-source.
        Server-side operator code remains source-available pending D2 architecture changes that move
        proving to the client.
      </P>
    </DocsLayout>
  );
}
