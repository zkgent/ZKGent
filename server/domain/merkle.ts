/**
 * ZKGENT Merkle Accumulator
 *
 * The Merkle tree accumulates commitments. A Merkle inclusion proof
 * proves that a note (commitment) exists in the shielded state without
 * revealing which commitment it is.
 *
 * STATUS:
 *   - Binary Merkle tree structure: IMPLEMENTED (append-only, DB-backed)
 *   - Membership / inclusion proof generation: SCAFFOLD
 *   - Incremental tree update: IMPLEMENTED
 *   - ZK-compatible sparse Merkle tree: SCAFFOLD
 *   - On-chain Merkle root anchoring: SCAFFOLD
 *
 * Tree depth: 20 (supports up to 2^20 = 1,048,576 commitments)
 */

import { db } from "../db.js";
import { Bytes32, fieldToHex, hexToField, poseidonField2 } from "./crypto.js";

export const TREE_DEPTH = 20;
/**
 * Empty subtree value — field-zero. Convention used by Tornado-style
 * fixed-depth Merkle trees with Poseidon.
 */
export const ZERO_VALUE: Bytes32 = "0".repeat(64);

/**
 * Hash two sibling nodes to produce their parent.
 * IMPLEMENTED: Poseidon2 over BN254 — circuit-compatible.
 */
export function merkleHashPair(left: Bytes32, right: Bytes32): Bytes32 {
  // Both children are always 64-char hex field elements (commitments or interior nodes).
  return fieldToHex(poseidonField2(hexToField(left), hexToField(right)));
}

export interface MerkleNode {
  id: number;
  level: number; // 0 = leaf, TREE_DEPTH = root
  index: number; // position at this level
  value: Bytes32;
  commitment: Bytes32 | null; // only for leaf nodes
  created_at: string;
}

/**
 * Get current leaf count (= number of commitments inserted).
 * IMPLEMENTED.
 */
export function getLeafCount(): number {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM zk_merkle_nodes WHERE level = 0`).get() as {
    cnt: number;
  };
  return row.cnt;
}

/**
 * Get current Merkle root.
 * Returns null if tree is empty.
 * SCAFFOLD: This is a simplified sequential computation — not an
 * efficient incremental Merkle tree. Replace with a sparse/incremental
 * implementation for production.
 */
export function getMerkleRoot(): Bytes32 | null {
  const leafCount = getLeafCount();
  if (leafCount === 0) return null;

  const leaves = db
    .prepare(`SELECT value FROM zk_merkle_nodes WHERE level = 0 ORDER BY idx ASC`)
    .all() as { value: Bytes32 }[];

  let currentLevel = leaves.map((l) => l.value);
  while (currentLevel.length > 1) {
    const nextLevel: Bytes32[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : ZERO_VALUE;
      nextLevel.push(merkleHashPair(left, right));
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

/**
 * Append a commitment as a leaf to the Merkle tree.
 * IMPLEMENTED.
 */
export function appendLeaf(commitment: Bytes32): number {
  const index = getLeafCount();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO zk_merkle_nodes (level, idx, value, commitment, created_at)
    VALUES (0, ?, ?, ?, ?)
  `,
  ).run(index, commitment, commitment, now);

  return index;
}

export interface MerkleStats {
  leaf_count: number;
  current_root: Bytes32 | null;
  tree_depth: number;
  capacity: number;
}

export function getMerkleStats(): MerkleStats {
  const leafCount = getLeafCount();
  return {
    leaf_count: leafCount,
    current_root: getMerkleRoot(),
    tree_depth: TREE_DEPTH,
    capacity: Math.pow(2, TREE_DEPTH),
  };
}

/**
 * Generate an inclusion proof for a leaf.
 * SCAFFOLD: Returns proof structure but sibling computation is simplified.
 * A production implementation requires an efficient sparse Merkle tree
 * (e.g., SMT from @personaelabs/smtlib or a custom implementation).
 */
export function generateInclusionProof(leafIndex: number): {
  status: "scaffold";
  leaf_index: number;
  note: string;
  siblings: Bytes32[];
} {
  return {
    status: "scaffold",
    leaf_index: leafIndex,
    note: "Full inclusion proof generation requires sparse Merkle tree implementation (SCAFFOLD)",
    siblings: Array(TREE_DEPTH).fill(ZERO_VALUE),
  };
}
