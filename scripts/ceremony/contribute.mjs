#!/usr/bin/env node
/**
 * ZKGent Ceremony — contribute.mjs
 *
 * Append a new Phase-2 contribution to the ceremony chain.
 *
 * Usage:
 *   node scripts/ceremony/contribute.mjs --name "Alice" --handle "alice"
 *   node scripts/ceremony/contribute.mjs --name "Bob"   --handle "bob" --note "Contributed from air-gapped laptop"
 *
 * What it does:
 *   1. Loads current ceremony manifest.
 *   2. Determines previous zkey:
 *        - first contribution  -> uses transfer_0000.zkey (initial setup)
 *        - subsequent          -> uses contribution_NNNN.zkey from previous entry
 *   3. Generates 1024 bits of fresh OS entropy.
 *   4. Runs `snarkjs zkey contribute prev.zkey new.zkey -e=<entropy>`.
 *   5. Verifies new zkey via `snarkjs zkey verify` against r1cs + ptau.
 *   6. Computes SHA-256 of prev + new zkey.
 *   7. Writes attestation JSON + appends to manifest.
 *   8. Prints contributor + hashes.
 *
 * Toxic waste:
 *   The OS-random entropy is held in memory only for the duration of this
 *   process. It is NOT persisted. After process exit it is gone — that is the
 *   "destroy your secret" step. As long as you ran this on a system you
 *   trust, your contribution is sound.
 *
 * Re-randomization:
 *   The final beacon step (scripts/ceremony/beacon.mjs) re-randomizes with a
 *   PUBLIC entropy source (Solana finalized blockhash), preventing any
 *   contributor from controlling the final randomness.
 */

import { spawnSync } from "child_process";
import { randomBytes, createHash } from "crypto";
import fs from "fs";
import path from "path";
import {
  CEREMONY_DIR,
  CIRCUIT_INITIAL_ZKEY,
  CIRCUIT_R1CS,
  CIRCUIT_PTAU,
  loadManifest,
  appendContribution,
  hashFile,
  shortHash,
  nowIso,
  slugify,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.name || !args.handle) {
  console.error('Usage: contribute.mjs --name "Your Name" --handle "handle" [--note "..."]');
  process.exit(2);
}

if (!fs.existsSync(CIRCUIT_INITIAL_ZKEY)) {
  console.error(`Initial zkey not found at ${CIRCUIT_INITIAL_ZKEY}`);
  console.error("You need to run the circuit setup first (groth16 setup).");
  process.exit(2);
}
if (!fs.existsSync(CIRCUIT_R1CS)) {
  console.error(`r1cs not found at ${CIRCUIT_R1CS}`);
  process.exit(2);
}
if (!fs.existsSync(CIRCUIT_PTAU)) {
  console.error(`Phase-1 ptau not found at ${CIRCUIT_PTAU}`);
  process.exit(2);
}

const manifest = loadManifest();
const nextIndex = manifest.contributions.length + 1;

if (manifest.beacon) {
  console.error("Ceremony has already been finalized with a beacon.");
  console.error("To add more contributions, the beacon must be re-applied afterwards.");
  console.error("Aborting.");
  process.exit(2);
}

const prevZkey =
  nextIndex === 1
    ? CIRCUIT_INITIAL_ZKEY
    : path.join(CEREMONY_DIR, `contribution_${String(nextIndex - 1).padStart(4, "0")}.zkey`);

if (!fs.existsSync(prevZkey)) {
  console.error(`Previous zkey not found: ${prevZkey}`);
  process.exit(2);
}

const newZkey = path.join(CEREMONY_DIR, `contribution_${String(nextIndex).padStart(4, "0")}.zkey`);

console.log("─".repeat(72));
console.log(`ZKGent Ceremony — Contribution #${nextIndex}`);
console.log("─".repeat(72));
console.log(`Contributor : ${args.name} (@${args.handle})`);
console.log(`Previous    : ${path.relative(process.cwd(), prevZkey)}`);
console.log(`Output      : ${path.relative(process.cwd(), newZkey)}`);
if (args.note) console.log(`Note        : ${args.note}`);
console.log("");

// Generate 1024 bits = 128 bytes of OS entropy.
// snarkjs accepts a hex/text string via -e.
const entropyBytes = randomBytes(128);
const entropyHex = entropyBytes.toString("hex");
// Hash of entropy for the attestation (commits to "I used random entropy"
// without revealing it). NOT a security claim that the entropy was used —
// snarkjs is the source of truth there.
const entropyCommitment = createHash("sha256").update(entropyBytes).digest("hex");

console.log("Running snarkjs zkey contribute…");
const t0 = Date.now();
const res = spawnSync(
  "node",
  [
    "node_modules/snarkjs/build/cli.cjs",
    "zkey",
    "contribute",
    prevZkey,
    newZkey,
    `--name=${args.name}`,
    `-e=${entropyHex}`,
  ],
  { stdio: "inherit", cwd: process.cwd() },
);

// Best-effort: scrub local entropy buffers ASAP.
entropyBytes.fill(0);

if (res.status !== 0) {
  console.error(`\nsnarkjs exited with code ${res.status}`);
  process.exit(res.status ?? 1);
}
const contributeMs = Date.now() - t0;

console.log("\nVerifying new zkey against r1cs + ptau…");
const verify = spawnSync(
  "node",
  ["node_modules/snarkjs/build/cli.cjs", "zkey", "verify", CIRCUIT_R1CS, CIRCUIT_PTAU, newZkey],
  { stdio: "inherit", cwd: process.cwd() },
);
if (verify.status !== 0) {
  console.error("zkey verify FAILED — refusing to record this contribution.");
  // Remove the bad zkey to avoid confusing future runs.
  try {
    fs.unlinkSync(newZkey);
  } catch {}
  process.exit(1);
}

const prevHash = await hashFile(prevZkey);
const newHash = await hashFile(newZkey);

const entry = {
  index: nextIndex,
  name: args.name,
  handle: args.handle,
  slug: slugify(args.handle),
  note: args.note ?? null,
  contributed_at: nowIso(),
  prev_zkey_hash: prevHash,
  new_zkey_hash: newHash,
  entropy_bits: entropyBytes.length * 8,
  entropy_commitment_sha256: entropyCommitment,
  contribute_ms: contributeMs,
  snarkjs_verify_passed: true,
  artifact: path.relative(CEREMONY_DIR, newZkey),
};

appendContribution(manifest, entry);

console.log("\n─".repeat(72));
console.log(`✓ Contribution #${nextIndex} recorded`);
console.log(`  prev zkey hash : ${shortHash(prevHash)}`);
console.log(`  new  zkey hash : ${shortHash(newHash)}`);
console.log(`  artifact       : ${entry.artifact}`);
console.log(
  `  attestation    : contributions/${String(nextIndex).padStart(4, "0")}-${entry.slug}.json`,
);
console.log("─".repeat(72));
console.log("");
console.log("Next steps:");
console.log("  • Anyone else can now contribute by running this same script.");
console.log("  • When ready to finalize: npm run ceremony:beacon");
console.log("");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        out[a.slice(2)] = argv[++i];
      }
    }
  }
  return out;
}
