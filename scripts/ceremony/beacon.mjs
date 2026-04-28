#!/usr/bin/env node
/**
 * ZKGent Ceremony — beacon.mjs
 *
 * Apply the FINAL beacon contribution to the ceremony, finalizing it for
 * production use. The beacon entropy is PUBLIC (Solana mainnet finalized
 * blockhash) — this means it adds no toxic waste, but it does prevent any
 * earlier contributor from controlling the final randomness.
 *
 * Usage:
 *   node scripts/ceremony/beacon.mjs
 *
 * What it does:
 *   1. Loads manifest. Refuses if no contributions exist or beacon already applied.
 *   2. Fetches finalized slot + blockhash from Solana mainnet RPC.
 *   3. Derives 32 bytes: SHA256("zkgent-ceremony-beacon-v1" || slot || blockhash).
 *   4. Runs `snarkjs zkey beacon` with that beacon hex + 10 iterations.
 *   5. Verifies the resulting zkey.
 *   6. Exports verification_key.json from the final zkey.
 *   7. Copies final to server/circuits/transfer/build/transfer_final.zkey.
 *   8. Records beacon entry in manifest.
 *
 * Re-verification:
 *   Anyone can call Solana RPC `getBlock(slot)` and re-derive the beacon
 *   from the recorded slot + blockhash. They can then re-run snarkjs zkey
 *   beacon and check the resulting zkey hash matches what's published.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  CEREMONY_DIR,
  CIRCUIT_BUILD_DIR,
  CIRCUIT_R1CS,
  CIRCUIT_PTAU,
  CIRCUIT_FINAL_ZKEY,
  CIRCUIT_VKEY,
  loadManifest,
  setBeacon,
  fetchSolanaBeacon,
  hashFile,
  shortHash,
  nowIso,
} from "./lib.mjs";

const manifest = loadManifest();

if (manifest.contributions.length === 0) {
  console.error("Cannot apply beacon: ceremony has zero contributions.");
  console.error("Run scripts/ceremony/contribute.mjs at least once first.");
  process.exit(2);
}
if (manifest.beacon) {
  console.error("Beacon already applied at slot", manifest.beacon.slot);
  console.error("Aborting (re-applying would silently invalidate downstream verifiers).");
  process.exit(2);
}

const lastContribution = manifest.contributions[manifest.contributions.length - 1];
const lastIndex = lastContribution.index;
const prevZkey = path.join(
  CEREMONY_DIR,
  `contribution_${String(lastIndex).padStart(4, "0")}.zkey`
);
const beaconZkey = path.join(CEREMONY_DIR, "transfer_beacon.zkey");

console.log("─".repeat(72));
console.log("ZKGent Ceremony — Beacon (final)");
console.log("─".repeat(72));
console.log(`Previous     : contribution_${String(lastIndex).padStart(4,"0")}.zkey`);
console.log(`Output       : transfer_beacon.zkey`);
console.log("");

console.log("Fetching Solana mainnet finalized beacon…");
const beacon = await fetchSolanaBeacon();
console.log(`  slot       : ${beacon.slot}`);
console.log(`  blockhash  : ${beacon.blockhash}`);
console.log(`  block_time : ${beacon.block_time ? new Date(beacon.block_time * 1000).toISOString() : "?"}`);
console.log(`  beacon hex : ${shortHash(beacon.beacon_hex)}`);
console.log("");

// snarkjs takes beacon hex and iteration count.
const ITERATIONS = 10;
console.log(`Running snarkjs zkey beacon (${ITERATIONS} iterations)…`);
const t0 = Date.now();
const res = spawnSync(
  "node",
  [
    "node_modules/snarkjs/build/cli.cjs",
    "zkey",
    "beacon",
    prevZkey,
    beaconZkey,
    beacon.beacon_hex,
    String(ITERATIONS),
    "--name=solana-mainnet-beacon",
  ],
  { stdio: "inherit", cwd: process.cwd() }
);
if (res.status !== 0) {
  console.error("snarkjs zkey beacon failed");
  process.exit(res.status ?? 1);
}
const beaconMs = Date.now() - t0;

console.log("\nVerifying beacon zkey against r1cs + ptau…");
const verify = spawnSync(
  "node",
  [
    "node_modules/snarkjs/build/cli.cjs",
    "zkey",
    "verify",
    CIRCUIT_R1CS,
    CIRCUIT_PTAU,
    beaconZkey,
  ],
  { stdio: "inherit", cwd: process.cwd() }
);
if (verify.status !== 0) {
  console.error("zkey verify FAILED — refusing to publish beacon zkey.");
  try { fs.unlinkSync(beaconZkey); } catch {}
  process.exit(1);
}

console.log("\nExporting verification key…");
const exportRes = spawnSync(
  "node",
  [
    "node_modules/snarkjs/build/cli.cjs",
    "zkey",
    "export",
    "verificationkey",
    beaconZkey,
    CIRCUIT_VKEY,
  ],
  { stdio: "inherit", cwd: process.cwd() }
);
if (exportRes.status !== 0) {
  console.error("verification key export failed");
  process.exit(exportRes.status ?? 1);
}

// Promote beacon zkey to be the production transfer_final.zkey
fs.copyFileSync(beaconZkey, CIRCUIT_FINAL_ZKEY);

const prevHash    = await hashFile(prevZkey);
const beaconHash  = await hashFile(beaconZkey);
const finalHash   = await hashFile(CIRCUIT_FINAL_ZKEY);
const vkeyHash    = await hashFile(CIRCUIT_VKEY);

const beaconEntry = {
  ...beacon,
  iterations: ITERATIONS,
  applied_at: nowIso(),
  beacon_ms: beaconMs,
  prev_zkey_hash: prevHash,
  beacon_zkey_hash: beaconHash,
  final_zkey_hash: finalHash,
  verification_key_hash: vkeyHash,
  snarkjs_verify_passed: true,
};

manifest.final_zkey_hash = finalHash;
manifest.verification_key_hash = vkeyHash;
setBeacon(manifest, beaconEntry);

console.log("\n─".repeat(72));
console.log("✓ Ceremony finalized with Solana mainnet beacon");
console.log(`  beacon zkey hash : ${shortHash(beaconHash)}`);
console.log(`  final zkey hash  : ${shortHash(finalHash)}`);
console.log(`  vkey hash        : ${shortHash(vkeyHash)}`);
console.log(`  promoted to      : ${path.relative(process.cwd(), CIRCUIT_FINAL_ZKEY)}`);
console.log("─".repeat(72));
console.log("");
console.log("Run npm run ceremony:verify to validate the chain end-to-end.");
console.log("Restart the API server to pick up the new verification key.");
