/**
 * ZKGENT Solana Network Config & Status
 *
 * This file owns: network selection, endpoint config, RPC health check.
 * Transaction building & submission → solana_tx.ts
 */

export type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta";
export type SolanaCommitment = "processed" | "confirmed" | "finalized";

export interface SolanaConfig {
  network: SolanaNetwork;
  rpc_endpoint: string;
  commitment: SolanaCommitment;
  program_id: string;
  ct_mint: string;
  is_mainnet: boolean;
  is_production: boolean;
}

const ENDPOINTS: Record<SolanaNetwork, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

export function getExplorerBase(network: SolanaNetwork): string {
  if (network === "mainnet-beta") return "https://explorer.solana.com";
  return `https://explorer.solana.com?cluster=${network}`;
}

export function getTxExplorerUrl(signature: string, network: SolanaNetwork): string {
  if (network === "mainnet-beta") {
    return `https://explorer.solana.com/tx/${signature}`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
}

export function getSolanaConfig(): SolanaConfig {
  const raw = (process.env.SOLANA_NETWORK ?? "devnet") as SolanaNetwork;
  const network: SolanaNetwork =
    raw === "mainnet-beta" || raw === "testnet" || raw === "devnet" ? raw : "devnet";

  return {
    network,
    rpc_endpoint: process.env.SOLANA_RPC_ENDPOINT ?? ENDPOINTS[network],
    commitment: (process.env.SOLANA_COMMITMENT ?? "confirmed") as SolanaCommitment,
    program_id: process.env.ZKGENT_PROGRAM_ID ?? "not_deployed",
    ct_mint: process.env.ZKGENT_CT_MINT ?? "not_deployed",
    is_mainnet: network === "mainnet-beta",
    is_production: network === "mainnet-beta",
  };
}

export interface SolanaNetworkStatus {
  network: SolanaNetwork;
  is_mainnet: boolean;
  rpc_endpoint: string;
  reachable: boolean;
  slot: number | null;
  epoch: number | null;
  program_deployed: boolean;
  last_checked_at: string;
  error: string | null;
}

export async function checkSolanaStatus(): Promise<SolanaNetworkStatus> {
  const config = getSolanaConfig();
  const now = new Date().toISOString();
  const base = {
    network: config.network,
    is_mainnet: config.is_mainnet,
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
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEpochInfo", params: [] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ...base, reachable: false, slot: null, epoch: null, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as { result?: { absoluteSlot?: number; epoch?: number } };
    return {
      ...base,
      reachable: true,
      slot: data.result?.absoluteSlot ?? null,
      epoch: data.result?.epoch ?? null,
      error: null,
    };
  } catch (err: any) {
    return {
      ...base,
      reachable: false,
      slot: null,
      epoch: null,
      error: err.name === "AbortError" ? "timeout" : err.message,
    };
  }
}
