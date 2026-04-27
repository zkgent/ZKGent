/**
 * ZKGENT Transfer Circuit Driver
 *
 * Loads the compiled Groth16 artifacts (wasm + zkey + verification key) and
 * exposes prove/verify functions used by the settlement state machine.
 *
 * Artifacts are produced by `npm run circuit:setup` (see scripts in
 * package.json) using:
 *   - Hermez phase-1 ptau (multi-party, 140+ contributors)
 *   - Single-party phase-2 contribution (devnet trust model)
 *
 * Phase-2 toxic-waste disclosure:
 *   - Contributor: this dev environment (single party).
 *   - Entropy: nondeterministic, ephemeral (not persisted).
 *   - Implication: Whoever ran the setup could in principle forge a proof.
 *     For production, run a multi-party phase-2 ceremony.
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { groth16 } from "snarkjs";
import {
  Bytes32,
  fieldToHex,
  hexToField,
  poseidonField1,
  poseidonField2,
  poseidonField4,
  randomFieldSalt,
  strToField,
} from "./crypto.js";
import { TREE_DEPTH } from "./merkle.js";
import { generateZkMerkleWitness, computeZkMerkleRoot } from "./merkle_path.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CIRCUIT_DIR = path.resolve(__dirname, "../circuits/transfer");
const WASM_PATH = path.join(CIRCUIT_DIR, "build/transfer_js/transfer.wasm");
const ZKEY_PATH = path.join(CIRCUIT_DIR, "build/transfer_final.zkey");
const VKEY_PATH = path.join(CIRCUIT_DIR, "build/verification_key.json");

export const TRANSFER_CIRCUIT_ID = "zkgent-transfer-v1";
export const TRANSFER_PROVER_BACKEND = "groth16-snarkjs";

let _vkey: any | null = null;
let _ready: boolean | null = null;

/**
 * True iff all three Groth16 artifacts exist on disk.
 * Cached after first call. Checked at startup and reflected in /api/zk/system.
 */
export function isTransferCircuitReady(): boolean {
  if (_ready !== null) return _ready;
  const ok = fs.existsSync(WASM_PATH) && fs.existsSync(ZKEY_PATH) && fs.existsSync(VKEY_PATH);
  _ready = ok;
  return ok;
}

/** Lazy-load and cache the verification key JSON. */
function loadVerificationKey(): any {
  if (_vkey) return _vkey;
  if (!fs.existsSync(VKEY_PATH)) {
    throw new Error(`transfer_circuit: verification key missing at ${VKEY_PATH}`);
  }
  _vkey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
  return _vkey;
}

// ─── ZK-circuit-compatible commitment / nullifier formulas ───────────────────
// These intentionally live alongside the prover so they cannot drift from
// the circuit's algebraic statement.

/** owner_pk = Poseidon(owner_secret). Inputs/outputs as 64-char hex field elts. */
export function deriveOwnerPk(ownerSecretHex: Bytes32): Bytes32 {
  return fieldToHex(poseidonField1(hexToField(ownerSecretHex)));
}

/** asset_hash = strToField(asset) — deterministic field encoding of the asset code. */
export function assetHashHex(asset: string): Bytes32 {
  return fieldToHex(strToField(asset));
}

/** ZK-pipeline note commitment: Poseidon4(value, asset_hash, owner_pk, salt). */
export function computeZkCommitment(opts: {
  value: number;
  asset: string;
  ownerSecret: Bytes32;
  salt: Bytes32;
}): Bytes32 {
  const v = BigInt(Math.floor(opts.value));
  const a = strToField(opts.asset);
  const ownerPk = poseidonField1(hexToField(opts.ownerSecret));
  const s = hexToField(opts.salt);
  return fieldToHex(poseidonField4(v, a, ownerPk, s));
}

/** ZK-pipeline nullifier: Poseidon(owner_secret, leaf_index). */
export function computeZkNullifier(opts: { ownerSecret: Bytes32; leafIndex: number }): Bytes32 {
  return fieldToHex(poseidonField2(hexToField(opts.ownerSecret), BigInt(opts.leafIndex)));
}

/** Public binding commitment to value: Poseidon(value, salt). */
export function computeValueCommitment(value: number, salt: Bytes32): Bytes32 {
  return fieldToHex(poseidonField2(BigInt(Math.floor(value)), hexToField(salt)));
}

/** Generate a fresh per-note owner secret (random field element, 64-char hex). */
export function generateOwnerSecret(): Bytes32 {
  return randomFieldSalt();
}

// ─── Prove / Verify ──────────────────────────────────────────────────────────

export interface SpendWitness {
  value: number;
  salt: Bytes32;
  ownerSecret: Bytes32;
  leafIndex: number;
  /**
   * Optional snapshot of all Merkle leaves at the moment the settlement
   * captured them. When provided, the prover uses it INSTEAD of querying
   * the live DB — this prevents another concurrent settlement that
   * appended a leaf in between from changing the witness/root that the
   * proof commits to. Strongly recommended for settlement.executeSettlement
   * to keep the per-settlement Merkle root binding stable.
   */
  leavesSnapshot?: Bytes32[];
}

export interface SpendPublicSignals {
  merkle_root: Bytes32;
  nullifier: Bytes32;
  value_commitment: Bytes32;
  asset_hash: Bytes32;
}

export interface Groth16ProofPayload {
  _type: "groth16-zkgent-transfer-v1";
  _circuit_id: string;
  proof: any; // snarkjs Groth16 proof object {pi_a, pi_b, pi_c, ...}
  publicSignals: string[];
  prove_ms: number;
  verify_ms?: number;
}

/**
 * Generate a Groth16 spend proof for the given witness.
 *
 * Caller is responsible for ensuring the leaf at `leafIndex` was actually
 * inserted into the Merkle tree (so the witness path resolves).
 */
export async function proveSpend(opts: { asset: string; witness: SpendWitness }): Promise<{
  proof: Groth16ProofPayload;
  publicSignals: SpendPublicSignals;
}> {
  if (!isTransferCircuitReady()) {
    throw new Error(
      "transfer circuit not ready: missing wasm/zkey/verification_key (run npm run circuit:setup)",
    );
  }

  const { witness } = opts;
  const asset_hash = assetHashHex(opts.asset);
  const value_commitment = computeValueCommitment(witness.value, witness.salt);
  const nullifier = computeZkNullifier({
    ownerSecret: witness.ownerSecret,
    leafIndex: witness.leafIndex,
  });

  const { pathElements, pathIndices, root } = generateZkMerkleWitness(
    witness.leafIndex,
    witness.leavesSnapshot,
  );

  const input = {
    merkle_root: hexToField(root).toString(),
    nullifier: hexToField(nullifier).toString(),
    value_commitment: hexToField(value_commitment).toString(),
    asset_hash: hexToField(asset_hash).toString(),
    value: BigInt(Math.floor(witness.value)).toString(),
    salt: hexToField(witness.salt).toString(),
    owner_secret: hexToField(witness.ownerSecret).toString(),
    leaf_index: witness.leafIndex.toString(),
    merkle_path_elements: pathElements.map((e) => hexToField(e).toString()),
    merkle_path_indices: pathIndices.map((i) => i.toString()),
  };

  const t0 = Date.now();
  const { proof, publicSignals } = await groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
  const prove_ms = Date.now() - t0;

  const payload: Groth16ProofPayload = {
    _type: "groth16-zkgent-transfer-v1",
    _circuit_id: TRANSFER_CIRCUIT_ID,
    proof,
    publicSignals,
    prove_ms,
  };

  return {
    proof: payload,
    publicSignals: {
      merkle_root: root,
      nullifier,
      value_commitment,
      asset_hash,
    },
  };
}

/**
 * Verify a Groth16 spend proof. Pure cryptographic check — no DB access.
 * Returns false on any failure; never throws on bad proof.
 */
export async function verifySpend(payload: Groth16ProofPayload): Promise<{
  valid: boolean;
  verify_ms: number;
  reason?: string;
}> {
  const t0 = Date.now();
  try {
    if (payload?._type !== "groth16-zkgent-transfer-v1") {
      return { valid: false, verify_ms: 0, reason: "unknown_proof_type" };
    }
    const vkey = loadVerificationKey();
    const ok = await groth16.verify(vkey, payload.publicSignals, payload.proof);
    return {
      valid: !!ok,
      verify_ms: Date.now() - t0,
      reason: ok ? "groth16_proof_valid" : "groth16_proof_invalid",
    };
  } catch (err: any) {
    return {
      valid: false,
      verify_ms: Date.now() - t0,
      reason: `verify_exception: ${err?.message ?? "unknown"}`,
    };
  }
}

/** Public diagnostic: number of Groth16 constraints (read from the r1cs build log). */
export const TRANSFER_CIRCUIT_INFO = {
  id: TRANSFER_CIRCUIT_ID,
  proving_system: "groth16",
  curve: "bn254",
  hash: "poseidon",
  constraints: 5914,
  tree_depth: TREE_DEPTH,
  ptau_source: "powersOfTau28_hez_final_14 (Hermez/iden3 multi-party phase-1)",
  phase2_contributors: ["zkgent-dev (single-party, devnet only)"],
};

// Re-export for module consumers needing root recomputation.
export { computeZkMerkleRoot };
