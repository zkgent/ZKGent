/* eslint-disable */
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERE = (rel) => path.join(__dirname, rel);

const WASM = HERE("build/transfer_js/transfer.wasm");
const ZKEY = HERE("build/transfer_final.zkey");
const VKEY = JSON.parse(readFileSync(HERE("build/verification_key.json"), "utf8"));

const TREE_DEPTH = 20;

function randField(poseidon) {
  // 31-byte random → safely below BN254 field order.
  const b = randomBytes(31);
  return BigInt("0x" + b.toString("hex"));
}

function fieldToString(F, x) {
  return F.toString(x);
}

async function main() {
  console.log("─── Building Poseidon ───");
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // Witness inputs (private)
  const value        = 1234n;
  const asset_hash   = BigInt("0x" + Buffer.from("USDC").toString("hex").padEnd(8, "0"));
  const salt         = randField();
  const owner_secret = randField();
  const leaf_index   = 0; // first leaf

  // Derived values
  const owner_pk = F.toObject(poseidon([owner_secret]));
  const note_commitment = F.toObject(
    poseidon([value, asset_hash, owner_pk, salt])
  );
  const nullifier = F.toObject(poseidon([owner_secret, BigInt(leaf_index)]));
  const value_commitment = F.toObject(poseidon([value, salt]));

  console.log("note_commitment :", "0x" + note_commitment.toString(16));
  console.log("nullifier       :", "0x" + nullifier.toString(16));
  console.log("value_commitment:", "0x" + value_commitment.toString(16));

  // Build empty Merkle tree of depth 20 with this leaf at index 0.
  // Empty children at each level use ZERO_VALUE = 0.
  const ZERO = 0n;
  // pathElements[i] = sibling at level i. For leaf_index = 0, all siblings
  // are the empty subtree value at that level.
  const pathElements = [];
  let zero_at_level = ZERO;
  for (let i = 0; i < TREE_DEPTH; i++) {
    pathElements.push(zero_at_level);
    zero_at_level = F.toObject(poseidon([zero_at_level, zero_at_level]));
  }
  // pathIndices for index 0 = all zeros.
  const pathIndices = new Array(TREE_DEPTH).fill(0);

  // Compute expected root by walking up.
  let cur = note_commitment;
  for (let i = 0; i < TREE_DEPTH; i++) {
    const left  = pathIndices[i] === 0 ? cur : pathElements[i];
    const right = pathIndices[i] === 0 ? pathElements[i] : cur;
    cur = F.toObject(poseidon([left, right]));
  }
  const merkle_root = cur;
  console.log("merkle_root     :", "0x" + merkle_root.toString(16));

  // Build circuit input
  const input = {
    merkle_root:           merkle_root.toString(),
    nullifier:             nullifier.toString(),
    value_commitment:      value_commitment.toString(),
    asset_hash:            asset_hash.toString(),
    value:                 value.toString(),
    salt:                  salt.toString(),
    owner_secret:          owner_secret.toString(),
    leaf_index:            leaf_index.toString(),
    merkle_path_elements:  pathElements.map(x => x.toString()),
    merkle_path_indices:   pathIndices.map(x => x.toString()),
  };

  console.log("\n─── Generating Groth16 proof ───");
  const t0 = Date.now();
  const { proof, publicSignals } = await groth16.fullProve(input, WASM, ZKEY);
  const proveMs = Date.now() - t0;
  console.log(`prove: ${proveMs}ms`);
  console.log("public signals:", publicSignals);

  console.log("\n─── Verifying proof ───");
  const t1 = Date.now();
  const verified = await groth16.verify(VKEY, publicSignals, proof);
  const verifyMs = Date.now() - t1;
  console.log(`verify: ${verifyMs}ms — ${verified ? "✓ VALID" : "✗ INVALID"}`);

  if (!verified) process.exit(1);

  // Negative test: tamper with public signal, must fail.
  console.log("\n─── Negative test: tampered public signal ───");
  const tampered = [...publicSignals];
  tampered[0] = (BigInt(tampered[0]) + 1n).toString();
  const tamperedOk = await groth16.verify(VKEY, tampered, proof);
  console.log(`tampered verify: ${tamperedOk ? "✗ ACCEPTED (BUG!)" : "✓ REJECTED"}`);
  if (tamperedOk) process.exit(2);

  console.log("\n✅ Real Groth16 transfer circuit works end-to-end.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(99); });
