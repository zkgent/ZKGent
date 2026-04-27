/**
 * ZKGENT Groth16 Pipeline (REAL zk-SNARK)
 *
 * STATUS:
 *   - Preimage knowledge circuit (toy): IMPLEMENTED
 *     "I know x such that Poseidon(x) = h"
 *   - Real Circom → R1CS → Powers of Tau → Groth16 setup → prove → verify
 *   - All artifacts in server/circuits/preimage/
 *
 * SECURITY POSTURE:
 *   This is the FIRST real Groth16 wired into ZKGENT. It demonstrates the
 *   full toolchain works end-to-end. The trusted setup is SINGLE-PARTY
 *   (run by a single developer), so the proving key MUST NOT be used for
 *   anything where soundness matters in production. For real deployments
 *   the Powers of Tau ceremony must be multi-party (or use a public
 *   universal SRS like Hermez / Filecoin).
 *
 * NEXT STEP (production):
 *   - Replace toy preimage circuit with the actual ZKGENT transfer circuit
 *     (Poseidon membership proof + nullifier derivation + balance check).
 *   - Use a multi-party Powers of Tau ceremony.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { groth16 } from "snarkjs";
import { poseidonField1, fieldToHex, hexToField, BN254_PRIME } from "./crypto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CIRCUIT_DIR = path.join(__dirname, "..", "circuits", "preimage");

const WASM_PATH = path.join(CIRCUIT_DIR, "preimage_js", "preimage.wasm");
const ZKEY_PATH = path.join(CIRCUIT_DIR, "preimage_final.zkey");
const VKEY_PATH = path.join(CIRCUIT_DIR, "verification_key.json");

let _vkey: any = null;
function getVKey(): any {
  if (!_vkey) {
    _vkey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
  }
  return _vkey;
}

export interface Groth16ProofResult {
  ok: boolean;
  scheme: "groth16";
  curve: "bn254";
  circuit: "preimage-knowledge-v1";
  preimage_used: string; // hex (private input — only revealed in demo)
  expected_hash: string; // hex (public input)
  proof: any | null; // snarkjs proof object
  public_signals: string[] | null;
  prove_ms: number;
  verify_ms: number;
  verified: boolean;
  error?: string;
}

/**
 * Run a real Groth16 proof + verification end-to-end.
 *
 * The prover proves knowledge of `preimage` such that
 *   Poseidon(preimage) === expected_hash
 * without revealing preimage to the verifier.
 *
 * In the returned object we DO include the preimage for transparency in
 * the demo response, but in real use the preimage would never leave the
 * prover.
 */
export async function proveAndVerifyPreimage(
  preimageInput?: string | bigint,
): Promise<Groth16ProofResult> {
  // 1. Pick a preimage (either provided or random in field)
  let preimage: bigint;
  if (preimageInput !== undefined) {
    if (typeof preimageInput === "bigint") {
      preimage = preimageInput % BN254_PRIME;
    } else {
      preimage = hexToField(preimageInput);
    }
  } else {
    preimage = BigInt("0x" + Math.floor(Math.random() * 1e16).toString(16)) % BN254_PRIME;
  }

  // 2. Compute the expected Poseidon hash off-circuit.
  //    Inside the circuit, the same Poseidon will be recomputed and
  //    constrained to equal expected_hash.
  const expectedHash = poseidonField1(preimage);

  const result: Groth16ProofResult = {
    ok: false,
    scheme: "groth16",
    curve: "bn254",
    circuit: "preimage-knowledge-v1",
    preimage_used: fieldToHex(preimage),
    expected_hash: fieldToHex(expectedHash),
    proof: null,
    public_signals: null,
    prove_ms: 0,
    verify_ms: 0,
    verified: false,
  };

  try {
    // 3. Generate Groth16 proof
    const proveStart = Date.now();
    const { proof, publicSignals } = await groth16.fullProve(
      {
        preimage: preimage.toString(),
        expected_hash: expectedHash.toString(),
      },
      WASM_PATH,
      ZKEY_PATH,
    );
    result.prove_ms = Date.now() - proveStart;
    result.proof = proof;
    result.public_signals = publicSignals as string[];

    // 4. Verify Groth16 proof
    const verifyStart = Date.now();
    const vkey = getVKey();
    const verified = await groth16.verify(vkey, publicSignals, proof);
    result.verify_ms = Date.now() - verifyStart;
    result.verified = verified;
    result.ok = verified;
  } catch (err: any) {
    result.error = err?.message ?? String(err);
  }

  return result;
}

/**
 * Status report for the Groth16 pipeline — used by /api/zk/system.
 */
export function getGroth16Status() {
  const wasmExists = fs.existsSync(WASM_PATH);
  const zkeyExists = fs.existsSync(ZKEY_PATH);
  const vkeyExists = fs.existsSync(VKEY_PATH);
  const ready = wasmExists && zkeyExists && vkeyExists;
  return {
    available: ready,
    scheme: "groth16",
    curve: "bn254",
    circuit_id: "preimage-knowledge-v1",
    artifacts: {
      wasm: wasmExists,
      zkey: zkeyExists,
      vkey: vkeyExists,
    },
    setup: {
      powers_of_tau: "single-party local ceremony (NOT FOR PRODUCTION)",
      phase2: "single-party local contribution (NOT FOR PRODUCTION)",
      curve: "bn128 (alt_bn128 / BN254)",
      circuit_constraints: 213,
    },
    note:
      "Real Groth16 toolchain is wired and operational. This is a TOY circuit " +
      "(preimage knowledge). The trusted setup is single-party — do NOT use " +
      "this proving key for soundness-critical production deployments.",
  };
}
