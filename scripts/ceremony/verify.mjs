#!/usr/bin/env node
/**
 * ZKGent Ceremony — verify.mjs
 *
 * Walks the entire ceremony chain and re-verifies every contribution + beacon
 * using snarkjs. Exits 0 iff the chain is intact.
 *
 * Verification steps:
 *   1. Hash transfer_0000.zkey (initial setup); compare to first contribution's prev_zkey_hash.
 *   2. For each contribution N:
 *        a. snarkjs zkey verify r1cs ptau contribution_NNNN.zkey
 *        b. Hash file → must match manifest's new_zkey_hash
 *        c. If N>1: previous contribution's new_zkey_hash must match this entry's prev_zkey_hash
 *   3. If beacon present:
 *        a. snarkjs zkey verify on transfer_beacon.zkey
 *        b. Hash beacon zkey → must match manifest.beacon.beacon_zkey_hash
 *        c. Re-derive expected beacon_hex from slot+blockhash
 *        d. Production transfer_final.zkey hash must match manifest.final_zkey_hash
 *        e. verification_key.json hash must match manifest.verification_key_hash
 *
 * The Solana blockhash is NOT re-fetched here (mainnet history isn't always
 * available beyond the recent epoch), but the beacon derivation IS recomputed
 * from the recorded slot+blockhash so anyone can independently re-verify by
 * querying their own RPC at any time.
 */

import { spawnSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import * as snarkjs from "snarkjs";
import {
  CEREMONY_DIR,
  CIRCUIT_INITIAL_ZKEY,
  CIRCUIT_R1CS,
  CIRCUIT_PTAU,
  CIRCUIT_FINAL_ZKEY,
  CIRCUIT_VKEY,
  loadManifest,
  hashFile,
  shortHash,
} from "./lib.mjs";

const SKIP_RPC = process.argv.includes("--skip-rpc");

const manifest = loadManifest();
let failures = 0;
const log = (label, ok, detail = "") => {
  const tag = ok ? "  ✓" : "  ✗";
  console.log(`${tag} ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

console.log("─".repeat(72));
console.log(`ZKGent Ceremony — Verify`);
console.log("─".repeat(72));
console.log(`schema_version : ${manifest.schema_version}`);
console.log(`circuit_id     : ${manifest.circuit_id}`);
console.log(`contributions  : ${manifest.contributions.length}`);
console.log(`beacon applied : ${manifest.beacon ? "yes" : "no"}`);
console.log("");

if (manifest.contributions.length === 0) {
  console.log("Nothing to verify — ceremony is empty.");
  process.exit(0);
}

console.log("[1] Initial setup zkey…");
if (!fs.existsSync(CIRCUIT_INITIAL_ZKEY)) {
  log(`transfer_0000.zkey present`, false);
  process.exit(1);
}
const initialHash = await hashFile(CIRCUIT_INITIAL_ZKEY);
log(`transfer_0000.zkey present (${shortHash(initialHash)})`, true);
const firstPrev = manifest.contributions[0].prev_zkey_hash;
log(
  `first contribution prev_zkey_hash matches initial zkey`,
  firstPrev === initialHash,
  firstPrev === initialHash
    ? ""
    : `expected ${shortHash(initialHash)}, got ${shortHash(firstPrev)}`,
);

console.log("");
console.log("[2] Contribution chain…");

for (const c of manifest.contributions) {
  const idxStr = String(c.index).padStart(4, "0");
  const zkeyPath = path.join(CEREMONY_DIR, `contribution_${idxStr}.zkey`);
  console.log(`  #${c.index} — ${c.name} (@${c.handle})`);
  if (!fs.existsSync(zkeyPath)) {
    log(`    artifact present (contribution_${idxStr}.zkey)`, false);
    continue;
  }
  log(`    artifact present`, true);

  const verify = spawnSync(
    "node",
    ["node_modules/snarkjs/build/cli.cjs", "zkey", "verify", CIRCUIT_R1CS, CIRCUIT_PTAU, zkeyPath],
    { stdio: "ignore", cwd: process.cwd() },
  );
  log(`    snarkjs zkey verify`, verify.status === 0);

  const actualHash = await hashFile(zkeyPath);
  log(
    `    new_zkey_hash matches manifest`,
    actualHash === c.new_zkey_hash,
    actualHash === c.new_zkey_hash
      ? ""
      : `expected ${shortHash(c.new_zkey_hash)}, got ${shortHash(actualHash)}`,
  );

  if (c.index > 1) {
    const prev = manifest.contributions.find((x) => x.index === c.index - 1);
    if (prev) {
      log(
        `    prev_zkey_hash chains from contribution ${c.index - 1}`,
        c.prev_zkey_hash === prev.new_zkey_hash,
      );
    }
  }
}

if (manifest.beacon) {
  console.log("");
  console.log("[3] Beacon…");
  const beaconZkey = path.join(CEREMONY_DIR, "transfer_beacon.zkey");
  if (!fs.existsSync(beaconZkey)) {
    log("transfer_beacon.zkey present", false);
  } else {
    log("transfer_beacon.zkey present", true);

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
      { stdio: "ignore", cwd: process.cwd() },
    );
    log("snarkjs zkey verify beacon", verify.status === 0);

    const actualBeaconHash = await hashFile(beaconZkey);
    log("beacon_zkey_hash matches manifest", actualBeaconHash === manifest.beacon.beacon_zkey_hash);

    // Re-derive beacon from slot + blockhash (independent of any RPC call).
    const expected = createHash("sha256")
      .update("zkgent-ceremony-beacon-v1")
      .update(String(manifest.beacon.slot))
      .update(manifest.beacon.blockhash)
      .digest("hex");
    log(`beacon_hex re-derives from slot+blockhash`, expected === manifest.beacon.beacon_hex);

    // Last contribution → beacon prev hash chain.
    const last = manifest.contributions[manifest.contributions.length - 1];
    log(
      "beacon prev_zkey_hash chains from last contribution",
      manifest.beacon.prev_zkey_hash === last.new_zkey_hash,
    );

    // Production zkey hash check.
    if (fs.existsSync(CIRCUIT_FINAL_ZKEY)) {
      const finalHash = await hashFile(CIRCUIT_FINAL_ZKEY);
      log(
        "transfer_final.zkey hash matches manifest.final_zkey_hash",
        finalHash === manifest.final_zkey_hash,
      );

      // Manifest internal consistency: production-final must equal beacon-final.
      log(
        "manifest.final_zkey_hash equals manifest.beacon.beacon_zkey_hash",
        manifest.final_zkey_hash === manifest.beacon.beacon_zkey_hash,
        manifest.final_zkey_hash === manifest.beacon.beacon_zkey_hash
          ? ""
          : `final=${shortHash(manifest.final_zkey_hash)} beacon=${shortHash(manifest.beacon.beacon_zkey_hash)}`,
      );

      // Cross-file equality: the production artifact must be byte-identical
      // to the on-disk beacon artifact. This kills the "swap final zkey but
      // leave beacon intact" attack.
      const beaconActualHash = await hashFile(beaconZkey);
      log(
        "transfer_final.zkey hash equals on-disk transfer_beacon.zkey hash",
        finalHash === beaconActualHash,
        finalHash === beaconActualHash
          ? ""
          : `final=${shortHash(finalHash)} beacon=${shortHash(beaconActualHash)}`,
      );
    } else {
      log("transfer_final.zkey present", false);
    }

    // Verification key hash check.
    if (fs.existsSync(CIRCUIT_VKEY)) {
      const vkeyHash = await hashFile(CIRCUIT_VKEY);
      log(
        "verification_key.json hash matches manifest.verification_key_hash",
        vkeyHash === manifest.verification_key_hash,
      );
    } else {
      log("verification_key.json present", false);
    }

    // Optional: re-fetch slot from Solana RPC to confirm the recorded blockhash
    // is real. Skipped with --skip-rpc, or if mainnet history doesn't have it.
    if (!SKIP_RPC) {
      console.log("");
      console.log("[3a] Solana RPC re-anchor (best-effort, skipped with --skip-rpc)…");
      try {
        const rpc = manifest.beacon.rpc;
        const res = await fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBlock",
            params: [
              manifest.beacon.slot,
              {
                transactionDetails: "none",
                rewards: false,
                maxSupportedTransactionVersion: 0,
              },
            ],
          }),
        });
        const json = await res.json();
        if (json.error) {
          // Older slots may have been pruned by public RPC. Treat as warning,
          // not a failure — chain math is still valid; user can re-check
          // against an archive node.
          console.log(
            `  ⚠ RPC could not return slot ${manifest.beacon.slot}: ${json.error.message}`,
          );
          console.log(`     (Verify manually against an archive RPC; not a chain failure.)`);
        } else if (json.result && json.result.blockhash) {
          log(
            `Solana mainnet slot ${manifest.beacon.slot} returns the recorded blockhash`,
            json.result.blockhash === manifest.beacon.blockhash,
            json.result.blockhash === manifest.beacon.blockhash
              ? ""
              : `recorded=${manifest.beacon.blockhash} rpc=${json.result.blockhash}`,
          );
        } else {
          console.log(`  ⚠ Unexpected RPC response shape; skipping anchor check.`);
        }
      } catch (err) {
        console.log(`  ⚠ RPC error: ${err.message}. Run with --skip-rpc to suppress.`);
      }
    }
  }
}

// [4] CRYPTOGRAPHIC chain attestation: snarkjs.zKey.verifyFromInit walks the
// entire phase-2 contribution sequence encoded INSIDE transfer_final.zkey,
// proving it is a valid extension of transfer_0000.zkey via the recorded
// powersOfTau. This is the strongest single check: even if a manifest entry
// is forged, the bytes inside transfer_final.zkey are themselves a verifiable
// chain back to the initial setup.
console.log("");
console.log("[4] Cryptographic chain attestation (snarkjs verifyFromInit)…");
if (!fs.existsSync(CIRCUIT_INITIAL_ZKEY) || !fs.existsSync(CIRCUIT_FINAL_ZKEY)) {
  log("initial + final zkey present", false);
} else {
  try {
    const ok = await snarkjs.zKey.verifyFromInit(
      CIRCUIT_INITIAL_ZKEY,
      CIRCUIT_PTAU,
      CIRCUIT_FINAL_ZKEY,
      undefined,
    );
    log("transfer_final.zkey is a valid phase-2 extension of transfer_0000.zkey", ok === true);
  } catch (err) {
    log(`verifyFromInit threw: ${err.message}`, false);
  }

  // Note: verifyFromInit walks the entire phase-2 contribution chain encoded
  // INSIDE transfer_final.zkey and validates each step against the powersOfTau.
  // This is the strongest single guarantee we can provide: even if the manifest
  // is forged, the bytes of transfer_final.zkey themselves carry a complete,
  // independently-verifiable chain back to the initial setup.
}

console.log("");
console.log("─".repeat(72));
if (failures === 0) {
  console.log("✓ Chain verified end-to-end. Ceremony is intact.");
} else {
  console.log(`✗ ${failures} check(s) failed. Chain is NOT intact.`);
}
console.log("─".repeat(72));

process.exit(failures === 0 ? 0 : 1);
