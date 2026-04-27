/**
 * ZKGENT Merkle Path Generator (real, not scaffold)
 *
 * Produces fixed-depth-20 Merkle roots and inclusion-proof witnesses
 * compatible with the Groth16 transfer circuit:
 *   server/circuits/transfer/transfer.circom
 *
 * Both this module and the circuit must agree on:
 *   - Hash function: Poseidon over BN254 (poseidon-lite ↔ circomlib Poseidon)
 *   - Empty subtree value: Z[0] = 0; Z[L+1] = H(Z[L], Z[L])
 *   - Tree layout: append-only, leaves at level 0 in insertion order
 *   - Sibling order at level L: left child at index (i & ~1), right at (i | 1)
 */

import { db } from "../db.js";
import {
  Bytes32,
  fieldToHex,
  hexToField,
  poseidonField2,
} from "./crypto.js";
import { TREE_DEPTH, ZERO_VALUE } from "./merkle.js";

/** Empty-subtree value at each level, computed once and cached. */
let EMPTY_SUBTREES_CACHE: Bytes32[] | null = null;
export function getEmptySubtrees(): Bytes32[] {
  if (EMPTY_SUBTREES_CACHE) return EMPTY_SUBTREES_CACHE;
  const z: Bytes32[] = [ZERO_VALUE];
  for (let i = 0; i < TREE_DEPTH; i++) {
    z.push(
      fieldToHex(poseidonField2(hexToField(z[i]), hexToField(z[i])))
    );
  }
  EMPTY_SUBTREES_CACHE = z;
  return z;
}

/** Hash two siblings — must match merkle.ts and the circuit's Poseidon(2). */
function hashPair(left: Bytes32, right: Bytes32): Bytes32 {
  return fieldToHex(poseidonField2(hexToField(left), hexToField(right)));
}

/** Read all current leaves (level-0 nodes) in insertion order. */
export function loadAllLeaves(): Bytes32[] {
  const rows = db.prepare(
    `SELECT value FROM zk_merkle_nodes WHERE level = 0 ORDER BY idx ASC`
  ).all() as { value: Bytes32 }[];
  return rows.map(r => r.value);
}

/**
 * Compute the fixed-depth-20 Merkle root for the current set of leaves.
 *
 * Unlike the legacy getMerkleRoot in merkle.ts (which stops when the level
 * collapses to one node), this always walks all 20 levels using the empty
 * subtree value as the right-side filler at every level. The result is the
 * canonical "Tornado-style" root that the circuit expects.
 */
export function computeZkMerkleRoot(leaves?: Bytes32[]): Bytes32 {
  const z = getEmptySubtrees();
  const leafSet = leaves ?? loadAllLeaves();

  if (leafSet.length === 0) return z[TREE_DEPTH];

  let cur = leafSet.slice();
  for (let L = 0; L < TREE_DEPTH; L++) {
    const next: Bytes32[] = [];
    for (let j = 0; j < cur.length; j += 2) {
      const left = cur[j];
      const right = j + 1 < cur.length ? cur[j + 1] : z[L];
      next.push(hashPair(left, right));
    }
    cur = next;
  }
  // After 20 iterations, cur represents the leftmost "branch" of the tree.
  // The circuit's MerkleProof template recombines that branch with empty
  // subtrees to the right at higher levels, but since we already padded
  // with z[L] at each step, cur[0] IS the full-tree root.
  return cur[0];
}

/**
 * Generate the Merkle inclusion witness for the leaf at `leafIndex`.
 *
 * Returns `pathElements[20]` and `pathIndices[20]` such that hashing
 * the leaf upward against these siblings yields the same root as
 * `computeZkMerkleRoot`. These arrays are the witness signals consumed
 * by the Groth16 transfer circuit.
 */
export function generateZkMerkleWitness(
  leafIndex: number,
  /**
   * Optional snapshot of leaves to use instead of the live DB. Pass this
   * when proving for a settlement that captured the tree state at insertion
   * time, so concurrent appends from other in-flight settlements cannot
   * change the witness/root the proof commits to.
   */
  leavesSnapshot?: Bytes32[],
): {
  pathElements: Bytes32[];
  pathIndices: number[];
  root: Bytes32;
} {
  const z = getEmptySubtrees();
  const leaves = leavesSnapshot ?? loadAllLeaves();

  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(
      `generateZkMerkleWitness: leafIndex ${leafIndex} out of range (leaves=${leaves.length})`
    );
  }

  const pathElements: Bytes32[] = [];
  const pathIndices: number[] = [];

  let cur = leaves.slice();
  let curIdx = leafIndex;

  for (let L = 0; L < TREE_DEPTH; L++) {
    const siblingIdx = curIdx ^ 1;
    const sibling = siblingIdx < cur.length ? cur[siblingIdx] : z[L];
    pathElements.push(sibling);
    pathIndices.push(curIdx & 1);

    // Build next level (parents).
    const next: Bytes32[] = [];
    for (let j = 0; j < cur.length; j += 2) {
      const left = cur[j];
      const right = j + 1 < cur.length ? cur[j + 1] : z[L];
      next.push(hashPair(left, right));
    }
    cur = next;
    curIdx = curIdx >> 1;
  }

  const root = cur.length > 0 ? cur[0] : z[TREE_DEPTH];

  // Sanity: re-walk witness from leaf and assert it matches root.
  const leafValue = leaves[leafIndex];
  let acc = leafValue;
  for (let L = 0; L < TREE_DEPTH; L++) {
    const sib = pathElements[L];
    const isRight = pathIndices[L] === 1;
    const left = isRight ? sib : acc;
    const right = isRight ? acc : sib;
    acc = hashPair(left, right);
  }
  if (acc !== root) {
    throw new Error(
      `generateZkMerkleWitness: internal consistency check failed (computed=${acc.slice(0, 16)} root=${root.slice(0, 16)})`
    );
  }

  return { pathElements, pathIndices, root };
}
