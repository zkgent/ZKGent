pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";

/*
 * ZKGENT Toy Groth16 Circuit — Preimage Knowledge
 *
 * Statement proven (in zero knowledge):
 *   "I know a value `preimage` such that Poseidon(preimage) == expected_hash"
 *
 * Inputs:
 *   - preimage      (PRIVATE)  — secret known only to the prover
 *   - expected_hash (PUBLIC)   — the Poseidon commitment everyone can see
 *
 * The verifier learns: yes, the prover knows some preimage matching the
 * public hash. The verifier learns NOTHING about the preimage itself.
 *
 * This is a toy circuit suitable for demonstrating that the full Groth16
 * pipeline (Circom → R1CS → Powers of Tau → zkey → proof → verify) works
 * end-to-end. It is NOT the production transfer circuit.
 *
 * Trusted setup: SINGLE-PARTY (NOT FOR PRODUCTION).
 * For production use a multi-party Powers of Tau ceremony.
 */
template Preimage() {
    signal input preimage;        // private witness
    signal input expected_hash;   // public input

    component h = Poseidon(1);
    h.inputs[0] <== preimage;

    // Constraint: computed hash must equal the claimed expected_hash.
    // If the prover doesn't know `preimage` such that Poseidon(preimage) ==
    // expected_hash, the witness fails to satisfy this constraint and no
    // valid proof can be produced.
    expected_hash === h.out;
}

component main {public [expected_hash]} = Preimage();
