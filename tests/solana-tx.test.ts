import test from "node:test";
import assert from "node:assert/strict";

import { createSettlementMemoText } from "../server/domain/solana_tx.js";

test("creates a deterministic settlement memo payload", () => {
  const memo = createSettlementMemoText({
    settlement_id: "STL-ABCD1234",
    commitment_short: "deadbeefcafe",
    nullifier_short: "feedfacebabe",
    proof_id: "PRF-9XYZ0001",
    version: "v1",
  });

  assert.equal(memo, "zkgent:v1:STL-ABCD1234:deadbeefcafe:feedfacebabe:PRF-9XYZ0001");
});
