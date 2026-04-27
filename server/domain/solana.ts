/**
 * ZKGENT Solana Integration
 *
 * STATUS:
 *   - Network config and endpoint selection: IMPLEMENTED
 *   - Devnet connection and health check: IMPLEMENTED (HTTP RPC)
 *   - Transaction builder abstraction: SCAFFOLD
 *   - Program client (custom Solana program): SCAFFOLD
 *   - On-chain settlement execution: SCAFFOLD
 *   - Confidential Token (SPL Token-2022 CT) integration: SCAFFOLD
 *
 * Network: Solana Devnet (primary), Mainnet-Beta (production)
 */

import crypto from "crypto";

export type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta";
export type SolanaCommitment = "processed" | "confirmed" | "finalized";

export interface SolanaConfig {
  network: SolanaNetwork;
  rpc_endpoint: string;
  commitment: SolanaCommitment;
  program_id: string;  // SCAFFOLD: not yet deployed
  ct_mint: string;     // SCAFFOLD: Confidential Token mint address
}

const ENDPOINTS: Record<SolanaNetwork, string> = {
  "devnet":       "https://api.devnet.solana.com",
  "testnet":      "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

export function getSolanaConfig(): SolanaConfig {
  const network = (process.env.SOLANA_NETWORK ?? "devnet") as SolanaNetwork;
  return {
    network,
    rpc_endpoint: process.env.SOLANA_RPC_ENDPOINT ?? ENDPOINTS[network],
    commitment:   (process.env.SOLANA_COMMITMENT ?? "confirmed") as SolanaCommitment,
    program_id:   process.env.ZKGENT_PROGRAM_ID ?? "SCAFFOLD_PROGRAM_NOT_DEPLOYED",
    ct_mint:      process.env.ZKGENT_CT_MINT    ?? "SCAFFOLD_CT_MINT_NOT_DEPLOYED",
  };
}

export interface SolanaNetworkStatus {
  network: SolanaNetwork;
  rpc_endpoint: string;
  reachable: boolean;
  slot: number | null;
  epoch: number | null;
  block_time: number | null;
  tps_estimate: number | null;
  program_deployed: boolean;   // SCAFFOLD: always false until deployed
  last_checked_at: string;
  error: string | null;
}

/**
 * Check Solana devnet/mainnet health via JSON-RPC.
 * IMPLEMENTED: Real HTTP call to Solana RPC.
 */
export async function checkSolanaStatus(): Promise<SolanaNetworkStatus> {
  const config = getSolanaConfig();
  const now = new Date().toISOString();
  const base: Omit<SolanaNetworkStatus, "reachable" | "slot" | "epoch" | "block_time" | "tps_estimate" | "error"> = {
    network: config.network,
    rpc_endpoint: config.rpc_endpoint,
    program_deployed: false,
    last_checked_at: now,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(config.rpc_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getEpochInfo",
        params: [{ commitment: config.commitment }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ...base, reachable: false, slot: null, epoch: null, block_time: null, tps_estimate: null, error: `HTTP ${res.status}` };
    }

    const data = await res.json() as { result?: { absoluteSlot?: number; epoch?: number } };
    const result = data.result;

    return {
      ...base,
      reachable: true,
      slot:        result?.absoluteSlot ?? null,
      epoch:       result?.epoch ?? null,
      block_time:  null,
      tps_estimate: null,
      error: null,
    };
  } catch (err: any) {
    return {
      ...base,
      reachable: false,
      slot: null,
      epoch: null,
      block_time: null,
      tps_estimate: null,
      error: err.name === "AbortError" ? "timeout" : err.message,
    };
  }
}

/**
 * Transaction builder — SCAFFOLD.
 * When @solana/web3.js is integrated, this builds a real Transaction object.
 */
export function buildSettlementTransaction(opts: {
  commitment: string;
  nullifier: string;
  merkleRoot: string;
  proofData: string;
  senderPubkey: string;
  recipientPubkey: string;
}): { status: "scaffold"; note: string; tx_template: object } {
  return {
    status: "scaffold",
    note: "Real transaction requires @solana/web3.js + deployed ZKGENT Solana program. SCAFFOLD.",
    tx_template: {
      program_id:   getSolanaConfig().program_id,
      instruction:  "confidential_transfer",
      accounts: {
        sender:    opts.senderPubkey,
        recipient: opts.recipientPubkey,
      },
      data: {
        commitment:   opts.commitment,
        nullifier:    opts.nullifier,
        merkle_root:  opts.merkleRoot,
        proof_size:   opts.proofData.length,
      },
    },
  };
}

/**
 * Wallet signing flow — SCAFFOLD.
 * Real implementation connects to browser wallet (Phantom, Backpack, etc.)
 * via @solana/wallet-adapter-react on the frontend.
 */
export interface WalletSigningRequest {
  id: string;
  settlement_id: string;
  tx_data: string;       // base64 serialized transaction
  status: "pending" | "signed" | "rejected" | "expired";
  requested_at: string;
  expires_at: string;
}

export function createSigningRequest(settlementId: string, txData: string): WalletSigningRequest {
  return {
    id: `SIGN-${crypto.randomBytes(8).toString("hex").toUpperCase()}`,
    settlement_id: settlementId,
    tx_data: txData,
    status: "pending",
    requested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
  };
}
