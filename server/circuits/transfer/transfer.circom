pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/mux1.circom";

/*
 * ZKGENT Production Transfer Circuit — v1 (spend proof)
 *
 * Statement proven (in zero knowledge):
 *   "I know an unspent note (value, asset, owner_secret, salt) that:
 *     - has commitment C = Poseidon(value, asset_hash, owner_pk, salt)
 *       where owner_pk = Poseidon(owner_secret)
 *     - exists at position `leaf_index` in the Merkle tree with root
 *       `merkle_root` (proven via merkle_path[20])
 *     - whose canonical nullifier = Poseidon(owner_secret, leaf_index)
 *       matches the publicly published `nullifier`
 *     - whose value matches the public binding commitment
 *       value_commitment = Poseidon(value, salt)
 *     - 0 ≤ value < 2^64"
 *
 * The verifier learns:
 *   - merkle_root, nullifier, value_commitment, asset_hash    (public)
 * The verifier learns NOTHING about:
 *   - which leaf_index is being spent
 *   - the value, salt, or owner_secret
 *
 * This is the real production-style spend proof. Trusted setup uses the
 * Hermez phase-1 multi-party ceremony (140+ contributors) and a single-party
 * phase-2 contribution. The phase-2 step means soundness depends on the
 * single contributor not retaining toxic waste — for production, run a
 * proper multi-party phase-2 ceremony.
 *
 * Constraint count: ~6,000 (fits in pot14, capacity 16,384).
 */

// ─── MerkleProof: verify that `leaf` lives at `pathIndices` in tree with `root`
// pathIndices[i] ∈ {0,1}: 0 means current node is the LEFT child at level i,
// 1 means the current node is the RIGHT child.
template MerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output root;

    component hashers[depth];
    component muxL[depth];
    component muxR[depth];

    signal current[depth + 1];
    current[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        // Constrain pathIndices[i] to be a bit (0 or 1)
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        // Mux the order: when pathIndices[i] == 0, leaf is on the left.
        muxL[i] = Mux1();
        muxL[i].c[0] <== current[i];      // selector=0 → current goes left
        muxL[i].c[1] <== pathElements[i]; // selector=1 → sibling goes left
        muxL[i].s    <== pathIndices[i];

        muxR[i] = Mux1();
        muxR[i].c[0] <== pathElements[i]; // selector=0 → sibling goes right
        muxR[i].c[1] <== current[i];      // selector=1 → current goes right
        muxR[i].s    <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== muxL[i].out;
        hashers[i].inputs[1] <== muxR[i].out;

        current[i + 1] <== hashers[i].out;
    }

    root <== current[depth];
}

template Transfer(depth) {
    // ─── Public inputs ────────────────────────────────────────────────────
    signal input merkle_root;
    signal input nullifier;
    signal input value_commitment;
    signal input asset_hash;

    // ─── Private inputs (witness) ─────────────────────────────────────────
    signal input value;
    signal input salt;
    signal input owner_secret;
    signal input leaf_index;
    signal input merkle_path_elements[depth];
    signal input merkle_path_indices[depth];

    // 1. Range check: value must fit in 64 bits.
    component valueBits = Num2Bits(64);
    valueBits.in <== value;

    // 2. Derive owner_pk = Poseidon(owner_secret)
    component ownerPkH = Poseidon(1);
    ownerPkH.inputs[0] <== owner_secret;
    signal owner_pk;
    owner_pk <== ownerPkH.out;

    // 3. Compute note commitment = Poseidon(value, asset_hash, owner_pk, salt)
    component noteH = Poseidon(4);
    noteH.inputs[0] <== value;
    noteH.inputs[1] <== asset_hash;
    noteH.inputs[2] <== owner_pk;
    noteH.inputs[3] <== salt;
    signal note_commitment;
    note_commitment <== noteH.out;

    // 4. Verify Merkle membership: note_commitment must be at leaf_index in the tree.
    component mp = MerkleProof(depth);
    mp.leaf <== note_commitment;
    for (var i = 0; i < depth; i++) {
        mp.pathElements[i] <== merkle_path_elements[i];
        mp.pathIndices[i]  <== merkle_path_indices[i];
    }
    merkle_root === mp.root;

    // 5. Bind leaf_index to the path: the path indices interpreted as a binary
    //    number must equal leaf_index. This prevents the prover from claiming
    //    a different position than the one they used in the Merkle proof.
    var idxAcc = 0;
    var pow = 1;
    for (var i = 0; i < depth; i++) {
        idxAcc += merkle_path_indices[i] * pow;
        pow *= 2;
    }
    leaf_index === idxAcc;

    // 6. Verify nullifier = Poseidon(owner_secret, leaf_index)
    component nullH = Poseidon(2);
    nullH.inputs[0] <== owner_secret;
    nullH.inputs[1] <== leaf_index;
    nullifier === nullH.out;

    // 7. Verify value_commitment = Poseidon(value, salt)
    //    This is a binding (but not hiding-from-operator) commitment to the value,
    //    used so external verifiers can check the same value claim across systems.
    component valueComH = Poseidon(2);
    valueComH.inputs[0] <== value;
    valueComH.inputs[1] <== salt;
    value_commitment === valueComH.out;
}

component main {public [merkle_root, nullifier, value_commitment, asset_hash]} = Transfer(20);
