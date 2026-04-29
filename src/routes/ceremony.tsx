import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/ceremony")({
  component: CeremonyPage,
});

interface Contribution {
  index: number;
  name: string;
  handle: string;
  slug: string;
  note: string | null;
  contributed_at: string;
  prev_zkey_hash: string;
  new_zkey_hash: string;
  entropy_bits: number;
  entropy_commitment_sha256: string;
  contribute_ms?: number;
}

interface Beacon {
  source: string;
  rpc: string;
  slot: number;
  blockhash: string;
  block_time: number | null;
  beacon_hex: string;
  iterations: number;
  applied_at: string;
  prev_zkey_hash: string;
  beacon_zkey_hash: string;
  final_zkey_hash: string;
  verification_key_hash: string;
  note?: string;
}

interface CeremonyState {
  available: boolean;
  reason?: string;
  schema_version?: number;
  circuit_id?: string;
  created_at?: string;
  contributors_count: number;
  contributions: Contribution[];
  beacon: Beacon | null;
  beacon_applied: boolean;
  final_zkey_hash: string | null;
  verification_key_hash: string | null;
  derived_final_zkey_hash: string | null;
  derived_vkey_hash: string | null;
  hashes_consistent: boolean;
  trust_level:
    | "none"
    | "single_party"
    | "single_party_plus_beacon"
    | "multi_party"
    | "multi_party_plus_beacon";
  trust_summary: string;
  last_contribution_at: string | null;
  manifest_path_rel: string;
  fetched_at: string;
}

const TRUST_META: Record<
  CeremonyState["trust_level"],
  { label: string; tone: string; ring: string; bg: string }
> = {
  none: {
    label: "No ceremony",
    tone: "text-muted-foreground",
    ring: "border-hairline",
    bg: "bg-surface/40",
  },
  single_party: {
    label: "Single-party only",
    tone: "text-yellow-300",
    ring: "border-yellow-500/30",
    bg: "bg-yellow-500/[0.06]",
  },
  single_party_plus_beacon: {
    label: "1 contributor + beacon",
    tone: "text-cyan",
    ring: "border-cyan/30",
    bg: "bg-cyan/[0.06]",
  },
  multi_party: {
    label: "Multi-party (no beacon yet)",
    tone: "text-cyan",
    ring: "border-cyan/30",
    bg: "bg-cyan/[0.06]",
  },
  multi_party_plus_beacon: {
    label: "Multi-party + beacon",
    tone: "text-emerald",
    ring: "border-emerald/30",
    bg: "bg-emerald/[0.06]",
  },
};

function CeremonyPage() {
  const [state, setState] = useState<CeremonyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/zk/ceremony")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: CeremonyState) => {
        if (!cancelled) setState(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* swallow */
    }
  };

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-emerald/[0.04] blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-violet/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div>
          <Link
            to="/"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
          >
            ← Back to home
          </Link>
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Trusted-setup ceremony
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          The ZKGent transfer circuit needs a Phase-2 trusted setup. As long as ANY ONE contributor
          (or the public beacon) was honest about destroying their secret randomness, the circuit is
          sound and proofs cannot be forged. This page shows the current chain end-to-end. Anyone
          can independently verify it with{" "}
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
            npm run ceremony:verify
          </code>
          .
        </p>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 text-[13px] text-red-300">
            Failed to load ceremony state: {error}
          </div>
        )}

        {!state && !error && (
          <div className="mt-12 animate-pulse space-y-3">
            <div className="h-24 rounded-2xl bg-surface/40" />
            <div className="h-32 rounded-2xl bg-surface/40" />
            <div className="h-32 rounded-2xl bg-surface/40" />
          </div>
        )}

        {state && (
          <>
            {!state.hashes_consistent && (
              <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/[0.08] p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-300 mb-2">
                  ⚠ Integrity check failed
                </p>
                <p className="text-[13px] leading-relaxed text-red-200/90">
                  The on-disk <code className="font-mono text-[11px]">transfer_final.zkey</code>{" "}
                  and/or <code className="font-mono text-[11px]">verification_key.json</code> do NOT
                  match the hashes recorded in the manifest. The proving artifact in production
                  right now is NOT what this chain attests to. Re-run{" "}
                  <code className="font-mono text-[11px]">npm run ceremony:verify</code> to
                  investigate.
                </p>
              </div>
            )}
            <TrustBadge state={state} />
            <ChainOverview state={state} onCopy={copy} copied={copied} />
            <ContributorList state={state} onCopy={copy} copied={copied} />
            {state.beacon && <BeaconDetails beacon={state.beacon} onCopy={copy} copied={copied} />}
            <FinalArtifact state={state} onCopy={copy} copied={copied} />
            <HowToContribute />

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/trust-model"
                className="rounded-full border border-hairline px-5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition"
              >
                ← Trust model
              </Link>
              <Link
                to="/apply"
                className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:opacity-90 transition"
              >
                Request early access →
              </Link>
            </div>

            <p className="mt-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Manifest: {state.manifest_path_rel} · Fetched{" "}
              {new Date(state.fetched_at).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function TrustBadge({ state }: { state: CeremonyState }) {
  const meta = TRUST_META[state.trust_level];
  return (
    <div className={`mt-8 rounded-2xl border ${meta.ring} ${meta.bg} p-6`}>
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${meta.tone === "text-emerald" ? "bg-emerald" : meta.tone === "text-cyan" ? "bg-cyan" : meta.tone === "text-yellow-300" ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground"}`}
        />
        <span className={`font-mono text-[10px] uppercase tracking-widest ${meta.tone}`}>
          {meta.label}
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {state.contributors_count} contribution{state.contributors_count === 1 ? "" : "s"}
          {state.beacon_applied && " · beacon ✓"}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">{state.trust_summary}</p>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        Want to strengthen this? Add your own contribution — see "How to contribute" below.
        Production-grade typically wants 5+ independent contributors plus a public beacon.
      </p>
    </div>
  );
}

function ChainOverview({
  state,
  onCopy,
  copied,
}: {
  state: CeremonyState;
  onCopy: (s: string, l: string) => void;
  copied: string | null;
}) {
  const setupHash = state.contributions[0]?.prev_zkey_hash ?? null;
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
        Chain
      </h2>
      <div className="space-y-2">
        <ChainStep
          index="setup"
          label="Phase-1 ⟶ initial zkey"
          desc="Hermez phase-1 (140+ contributors) + groth16 setup → transfer_0000.zkey"
          hash={setupHash}
          onCopy={onCopy}
          copied={copied}
        />
        {state.contributions.map((c, i) => (
          <ChainStep
            key={c.index}
            index={`#${c.index}`}
            label={`${c.name} (@${c.handle})`}
            desc={`Phase-2 contribution · ${c.entropy_bits}b OS entropy · ${c.contribute_ms ?? "?"}ms`}
            hash={c.new_zkey_hash}
            arrow={i === 0 ? "→" : "→"}
            onCopy={onCopy}
            copied={copied}
          />
        ))}
        {state.beacon && (
          <ChainStep
            index="beacon"
            label="Solana mainnet beacon"
            desc={`slot ${state.beacon.slot} · ${state.beacon.iterations}-iter rerandomization`}
            hash={state.beacon.beacon_zkey_hash}
            highlight
            onCopy={onCopy}
            copied={copied}
          />
        )}
      </div>
    </section>
  );
}

function ChainStep({
  index,
  label,
  desc,
  hash,
  arrow,
  highlight,
  onCopy,
  copied,
}: {
  index: string;
  label: string;
  desc: string;
  hash: string | null;
  arrow?: string;
  highlight?: boolean;
  onCopy: (s: string, l: string) => void;
  copied: string | null;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border ${highlight ? "border-cyan/30 bg-cyan/[0.04]" : "border-hairline bg-surface/40"} p-3`}
    >
      <span
        className={`min-w-16 font-mono text-[10px] uppercase tracking-widest ${highlight ? "text-cyan" : "text-muted-foreground"}`}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {hash && (
        <button
          onClick={() => onCopy(hash, `chain-${index}`)}
          className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition shrink-0"
          title={`Click to copy: ${hash}`}
        >
          {copied === `chain-${index}` ? "✓ copied" : `${hash.slice(0, 8)}…${hash.slice(-6)}`}
        </button>
      )}
    </div>
  );
}

function ContributorList({
  state,
  onCopy,
  copied,
}: {
  state: CeremonyState;
  onCopy: (s: string, l: string) => void;
  copied: string | null;
}) {
  if (state.contributions.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
        Contributors ({state.contributions.length})
      </h2>
      <div className="space-y-3">
        {state.contributions.map((c) => (
          <article key={c.index} className="rounded-2xl border border-hairline bg-surface p-5">
            <header className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                #{String(c.index).padStart(4, "0")}
              </span>
              <span className="text-[14px] font-semibold text-foreground">{c.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">@{c.handle}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {new Date(c.contributed_at).toLocaleString()}
              </span>
            </header>
            {c.note && (
              <p className="mt-2 text-[12.5px] italic text-muted-foreground">"{c.note}"</p>
            )}
            <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <KV label="Entropy" value={`${c.entropy_bits} bits OS-random`} />
              <KV label="Compute" value={`${c.contribute_ms ?? "?"}ms`} />
              <KV
                label="Prev zkey"
                value={`${c.prev_zkey_hash.slice(0, 14)}…`}
                onClick={() => onCopy(c.prev_zkey_hash, `prev-${c.index}`)}
                copied={copied === `prev-${c.index}`}
              />
              <KV
                label="New zkey"
                value={`${c.new_zkey_hash.slice(0, 14)}…`}
                onClick={() => onCopy(c.new_zkey_hash, `new-${c.index}`)}
                copied={copied === `new-${c.index}`}
              />
              <KV
                label="Entropy commit"
                value={`${c.entropy_commitment_sha256.slice(0, 14)}…`}
                onClick={() => onCopy(c.entropy_commitment_sha256, `entropy-${c.index}`)}
                copied={copied === `entropy-${c.index}`}
                full
              />
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function BeaconDetails({
  beacon,
  onCopy,
  copied,
}: {
  beacon: Beacon;
  onCopy: (s: string, l: string) => void;
  copied: string | null;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-cyan mb-4">
        Final beacon
      </h2>
      <article className="rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-5">
        <header className="flex flex-wrap items-center gap-3">
          <span className="text-[14px] font-semibold text-foreground">
            Solana mainnet finalized blockhash
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {new Date(beacon.applied_at).toLocaleString()}
          </span>
        </header>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          A blockhash chosen AFTER all contributions were collected. Public, unpredictable in
          advance, and verifiable by anyone hitting Solana RPC. The beacon prevents any contributor
          from controlling the final randomness.
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <KV label="Source" value={beacon.source} />
          <KV label="RPC" value={beacon.rpc} />
          <KV
            label="Slot"
            value={String(beacon.slot)}
            onClick={() => onCopy(String(beacon.slot), "beacon-slot")}
            copied={copied === "beacon-slot"}
          />
          <KV label="Iterations" value={String(beacon.iterations)} />
          <KV
            label="Blockhash"
            value={`${beacon.blockhash.slice(0, 12)}…${beacon.blockhash.slice(-6)}`}
            onClick={() => onCopy(beacon.blockhash, "beacon-blockhash")}
            copied={copied === "beacon-blockhash"}
            full
          />
          <KV
            label="Beacon hex (32B)"
            value={`${beacon.beacon_hex.slice(0, 12)}…${beacon.beacon_hex.slice(-6)}`}
            onClick={() => onCopy(beacon.beacon_hex, "beacon-hex")}
            copied={copied === "beacon-hex"}
            full
          />
        </dl>

        <p className="mt-4 rounded-lg bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          beacon = SHA256(<span className="text-foreground">"zkgent-ceremony-beacon-v1"</span> ‖{" "}
          <span className="text-foreground">{beacon.slot}</span> ‖{" "}
          <span className="text-foreground">"{beacon.blockhash}"</span>)
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://solscan.io/block/${beacon.slot}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[11px] text-muted-foreground hover:border-cyan/40 hover:text-cyan transition"
          >
            View block on Solscan ↗
          </a>
        </div>
      </article>
    </section>
  );
}

function FinalArtifact({
  state,
  onCopy,
  copied,
}: {
  state: CeremonyState;
  onCopy: (s: string, l: string) => void;
  copied: string | null;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-emerald mb-4">
        Production artifact
      </h2>
      <article className="rounded-2xl border border-emerald/30 bg-emerald/[0.04] p-5">
        <p className="text-[13px] leading-relaxed text-foreground/85">
          The hashes below are recomputed live on every page load. They MUST match the values
          recorded in the manifest above.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2">
          <KV
            label="transfer_final.zkey"
            value={state.derived_final_zkey_hash ?? "missing"}
            onClick={() =>
              state.derived_final_zkey_hash && onCopy(state.derived_final_zkey_hash, "final-zkey")
            }
            copied={copied === "final-zkey"}
            full
          />
          <KV
            label="verification_key.json"
            value={state.derived_vkey_hash ?? "missing"}
            onClick={() => state.derived_vkey_hash && onCopy(state.derived_vkey_hash, "final-vkey")}
            copied={copied === "final-vkey"}
            full
          />
          <KV
            label="Hashes consistent?"
            value={state.hashes_consistent ? "✓ yes" : "✗ MISMATCH"}
            highlight={state.hashes_consistent ? "ok" : "bad"}
          />
        </dl>
      </article>
    </section>
  );
}

function HowToContribute() {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
        How to contribute
      </h2>
      <div className="rounded-2xl border border-hairline bg-surface/60 p-6 space-y-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Anyone can add a contribution. Each contribution requires the previous zkey, runs locally
          on your machine, and produces a new zkey. The OS-random entropy you generate during the
          contribution exists only in your process memory and is destroyed when the script exits —
          that is the "destroy your toxic waste" step.
        </p>

        <ol className="space-y-3 text-[13px] text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald shrink-0 w-5">1.</span>
            <div>
              Clone the repo & install:{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                git clone … && npm install
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald shrink-0 w-5">2.</span>
            <div>
              Run your contribution:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 font-mono text-[11px] text-foreground">
                {`npm run ceremony:contribute -- \\
  --name "Your Name" \\
  --handle "your-handle" \\
  --note "Optional context"`}
              </pre>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald shrink-0 w-5">3.</span>
            <div>
              Verify locally:{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                npm run ceremony:verify
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald shrink-0 w-5">4.</span>
            <div>
              Open a pull request adding your{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                contribution_NNNN.zkey
              </code>{" "}
              + attestation JSON. The maintainers re-verify and merge.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[11px] text-emerald shrink-0 w-5">5.</span>
            <div>
              Once enough contributions are collected, the maintainers run{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                npm run ceremony:beacon
              </code>{" "}
              to apply a fresh Solana mainnet beacon and finalize.
            </div>
          </li>
        </ol>

        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.04] p-3 text-[12px] leading-relaxed text-yellow-200/80">
          <strong className="text-yellow-300">Soundness note:</strong> the security of the final
          zkey holds as long as ANY ONE contributor (or the beacon) was honest about destroying
          their secret. More contributors = stronger. One honest party is enough; you don't need to
          trust everyone.
        </div>
      </div>
    </section>
  );
}

function KV({
  label,
  value,
  onClick,
  copied,
  full,
  highlight,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  copied?: boolean;
  full?: boolean;
  highlight?: "ok" | "bad";
}) {
  const tone =
    highlight === "ok"
      ? "text-emerald"
      : highlight === "bad"
        ? "text-red-300"
        : "text-foreground/85";
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-hairline/60 bg-background/40 px-3 py-2 ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
        {label}
      </span>
      {onClick ? (
        <button
          onClick={onClick}
          className={`font-mono text-[11px] ${tone} hover:text-foreground transition truncate`}
          title="Click to copy full value"
        >
          {copied ? "✓ copied" : value}
        </button>
      ) : (
        <span className={`font-mono text-[11px] ${tone} truncate`}>{value}</span>
      )}
    </div>
  );
}

export default CeremonyPage;
