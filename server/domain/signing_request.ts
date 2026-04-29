export interface SigningRequestRow {
  id: string;
  settlement_id: string;
  tx_data: string;
  status: string;
  wallet_address: string | null;
  signature: string | null;
  requested_at: string;
  expires_at: string;
  responded_at: string | null;
}

function toMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSigningRequestConfirmError(
  request: SigningRequestRow,
  authenticatedWallet: string,
  now = new Date(),
):
  | "signing_request_not_pending"
  | "signing_request_already_responded"
  | "signing_request_expired"
  | "signing_request_wallet_missing"
  | "wallet_session_mismatch"
  | null {
  if (request.status !== "pending") return "signing_request_not_pending";
  if (request.responded_at) return "signing_request_already_responded";
  if (toMs(request.expires_at) <= now.getTime()) return "signing_request_expired";
  if (!request.wallet_address) return "signing_request_wallet_missing";
  if (request.wallet_address !== authenticatedWallet) return "wallet_session_mismatch";
  return null;
}
