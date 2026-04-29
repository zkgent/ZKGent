import test from "node:test";
import assert from "node:assert/strict";

import {
  getSigningRequestConfirmError,
  type SigningRequestRow,
} from "../server/domain/signing_request.js";

function makeRequest(overrides: Partial<SigningRequestRow> = {}): SigningRequestRow {
  return {
    id: "TXR-TEST",
    settlement_id: "STL-TEST",
    tx_data: "base64",
    status: "pending",
    wallet_address: "7y6zQm1YqK9m8qQbQ8d5v2YcW7nL4aBzM1P9rT4uH2cJ",
    signature: null,
    requested_at: "2026-04-29T11:00:00.000Z",
    expires_at: "2026-04-29T11:10:00.000Z",
    responded_at: null,
    ...overrides,
  };
}

test("accepts a pending request for the authenticated wallet", () => {
  const result = getSigningRequestConfirmError(
    makeRequest(),
    "7y6zQm1YqK9m8qQbQ8d5v2YcW7nL4aBzM1P9rT4uH2cJ",
    new Date("2026-04-29T11:05:00.000Z"),
  );

  assert.equal(result, null);
});

test("rejects mismatched wallets", () => {
  const result = getSigningRequestConfirmError(
    makeRequest(),
    "9V5QxV2F9y4k5YvSx7aQ9gkH2xR4sM8nN3uP6bC1dE7F",
    new Date("2026-04-29T11:05:00.000Z"),
  );

  assert.equal(result, "wallet_session_mismatch");
});

test("rejects expired requests", () => {
  const result = getSigningRequestConfirmError(
    makeRequest(),
    "7y6zQm1YqK9m8qQbQ8d5v2YcW7nL4aBzM1P9rT4uH2cJ",
    new Date("2026-04-29T11:11:00.000Z"),
  );

  assert.equal(result, "signing_request_expired");
});
