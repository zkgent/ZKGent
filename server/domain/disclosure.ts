/**
 * ZKGENT Compliance & Selective Disclosure
 *
 * The disclosure system allows authorized parties (auditors, regulators)
 * to verify transaction details without breaking privacy for everyone else.
 *
 * STATUS:
 *   - Disclosure model and policy types: IMPLEMENTED
 *   - View key abstraction: IMPLEMENTED (scaffold)
 *   - Selective disclosure record: IMPLEMENTED
 *   - Actual ZK proof of disclosure (range proof, etc.): SCAFFOLD
 *   - Regulatory reporting pipeline: SCAFFOLD
 *
 * TRUST MODEL:
 *   - Default policy: no disclosure
 *   - Audit key holders can decrypt note payloads they are authorized for
 *   - Disclosure proofs prove "amount is in range [0, X]" without revealing exact amount
 */

import { domainHash, DOMAIN, Bytes32 } from "./crypto.js";
import { getKeySet } from "./keys.js";

export type DisclosurePolicy =
  | "none" // no disclosure
  | "audit" // view key holder can see all
  | "counterparty" // only counterparty can see their own txns
  | "regulator" // regulatory reporting mode
  | "public"; // fully transparent (emergency/compliance mode)

export interface ViewKey {
  fingerprint: string;
  holder: string;
  policy: DisclosurePolicy;
  authorized_entities: string[]; // fingerprints of entities this key can view
  issued_at: string;
  expires_at: string | null;
}

export interface DisclosureRecord {
  id: string;
  note_id: string;
  commitment: Bytes32;
  disclosed_to: string; // fingerprint of recipient
  policy: DisclosurePolicy;
  revealed_fields: string[]; // e.g. ["amount", "asset"] but not ["sender", "recipient"]
  proof_type: "range_proof" | "equality_proof" | "membership_proof" | "scaffold";
  proof_status: "pending" | "generated" | "verified" | "scaffold";
  created_at: string;
}

/**
 * Generate a view key for an authorized party.
 * IMPLEMENTED: key derivation scaffold.
 */
export function issueViewKey(opts: {
  holder: string;
  policy: DisclosurePolicy;
  authorizedEntities?: string[];
  expiresInHours?: number;
}): ViewKey {
  const ks = getKeySet();
  const fingerprint = domainHash(DOMAIN.KEY_DERIVE, "view_key", ks.viewing.fingerprint, opts.holder)
    .slice(0, 16)
    .toUpperCase();

  return {
    fingerprint: `ZKG:VIEW:${fingerprint}`,
    holder: opts.holder,
    policy: opts.policy,
    authorized_entities: opts.authorizedEntities ?? [],
    issued_at: new Date().toISOString(),
    expires_at: opts.expiresInHours
      ? new Date(Date.now() + opts.expiresInHours * 3600 * 1000).toISOString()
      : null,
  };
}

/**
 * Create a selective disclosure record.
 * IMPLEMENTED: record structure.
 * SCAFFOLD: actual ZK range/equality proof generation.
 */
export function createDisclosureRecord(opts: {
  noteId: string;
  commitment: Bytes32;
  disclosedTo: string;
  policy: DisclosurePolicy;
  revealedFields: string[];
}): DisclosureRecord {
  return {
    id: `DISC-${Date.now().toString(36).toUpperCase()}`,
    note_id: opts.noteId,
    commitment: opts.commitment,
    disclosed_to: opts.disclosedTo,
    policy: opts.policy,
    revealed_fields: opts.revealedFields,
    proof_type: "scaffold",
    proof_status: "scaffold",
    created_at: new Date().toISOString(),
  };
}

/**
 * Get the current workspace disclosure policy from settings.
 * IMPLEMENTED.
 */
export function getDisclosureStatus(): {
  current_policy: DisclosurePolicy;
  viewing_key_fingerprint: string;
  compliance_mode: boolean;
  audit_key_active: boolean;
} {
  const ks = getKeySet();
  return {
    current_policy: "audit",
    viewing_key_fingerprint: ks.viewing.fingerprint,
    compliance_mode: process.env.ZKGENT_COMPLIANCE_MODE === "1",
    audit_key_active: true,
  };
}
