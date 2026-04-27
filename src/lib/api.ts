async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Transfer {
  id: string;
  reference: string;
  recipientAddress: string;
  amount: number | null;
  asset: string;
  status: "pending" | "verified" | "settled" | "failed";
  proofState: string;
  notes: string;
  region: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
}

export interface PayrollBatch {
  id: string;
  name: string;
  scheduledDate: string | null;
  recipientCount: number;
  asset: string;
  status: "draft" | "pending" | "settled";
  approvalThreshold: number;
  approvals: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryRoute {
  id: string;
  name: string;
  source: string;
  destination: string;
  policy: string;
  status: "active" | "idle" | "paused";
  allocationPercent: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastMovedAt: string | null;
}

export interface Counterparty {
  id: string;
  name: string;
  type: string;
  region: string;
  relationship: string;
  status: "verified" | "pending_kyc" | "not_connected";
  contactEmail: string;
  walletAddress: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
}

export interface ActivityEvent {
  id: string;
  category: string;
  event: string;
  detail: string;
  operator: string;
  status: string;
  relatedEntityType: string;
  relatedEntityId: string;
  createdAt: string;
}

export interface Settings {
  workspaceName: string;
  environment: string;
  defaultPaymentRail: string;
  privacyMode: boolean;
  hideAmounts: boolean;
  shieldedAddress: boolean;
  disclosurePolicy: string;
  complianceKeyFingerprint: string;
  notifyTransferSettled: boolean;
  notifyPayrollApproved: boolean;
  notifyCounterpartyKyc: boolean;
  notifySystemAlerts: boolean;
  updatedAt?: string;
}

export interface DashboardStats {
  transfers: { pending: number; verified: number; settled: number; failed: number; total: number };
  payroll: { draft: number; pending: number; settled: number; total: number };
  treasury: { total: number };
  counterparties: { verified: number; pending_kyc: number; not_connected: number; total: number };
  recentActivity: {
    id: string;
    category: string;
    event: string;
    detail: string;
    operator: string;
    status: string;
    createdAt: string;
  }[];
}

// ─── ZK System Types ────────────────────────────────────────────────────────

export interface ZkNoteStats {
  total: number;
  unspent: number;
  spent: number;
  pending_spend: number;
  total_shielded_value: number;
}
export interface ZkCommitmentStats {
  total: number;
  pending: number;
  inserted: number;
  finalized: number;
}
export interface ZkNullifierStats {
  total: number;
}
export interface ZkMerkleStats {
  leaf_count: number;
  current_root: string | null;
  tree_depth: number;
  capacity: number;
}
export interface ZkProofStats {
  total: number;
  pending: number;
  generating: number;
  generated: number;
  verified: number;
  failed: number;
  avg_generation_ms: number | null;
}
export interface ZkSettlementStats {
  total: number;
  queued: number;
  in_progress: number;
  confirmed: number;
  finalized: number;
  failed: number;
  settled?: number; // legacy field, use finalized instead
}
export interface ZkSolanaStatus {
  network: string;
  rpc_endpoint: string;
  reachable: boolean;
  slot: number | null;
  epoch: number | null;
  block_time: number | null;
  tps_estimate: number | null;
  program_deployed: boolean;
  last_checked_at: string;
  error: string | null;
}
export interface ZkDisclosureStatus {
  current_policy: string;
  viewing_key_fingerprint: string;
  compliance_mode: boolean;
  audit_key_active: boolean;
}
export interface ZkKeyStatus {
  operator_fingerprint: string;
  signing_fingerprint: string;
  encryption_fingerprint: string;
  viewing_fingerprint: string;
  custody_mode: string;
}
export interface ZkCircuitConfig {
  id: string;
  available: boolean;
  wasm: string;
  zkey: string;
  vkey: string;
  note: string;
}
export interface ZkCircuitStatus {
  transfer: ZkCircuitConfig;
  membership: ZkCircuitConfig;
  prover_backend: string;
  prover_pubkey: string;
  note: string;
}
export interface ZkOnChainTx {
  id: number;
  settlement_id: string;
  signature: string;
  status: string;
  memo_data: string;
  explorer_url: string | null;
  submitted_at: string;
  confirmed_at: string | null;
  error_message: string | null;
}
export interface ZkHashChainInfo {
  scheme: string; // "poseidon-bn254-v1"
  curve: string; // "BN254 (alt_bn128)"
  note: string;
}
export interface ZkGroth16Status {
  available: boolean;
  scheme: string; // "groth16"
  curve: string; // "bn254"
  circuit_id: string; // "preimage-knowledge-v1"
  artifacts: { wasm: boolean; zkey: boolean; vkey: boolean };
  setup: {
    powers_of_tau: string;
    phase2: string;
    curve: string;
    circuit_constraints: number;
  };
  note: string;
}
export interface ZkSystemInfo {
  notes: ZkNoteStats;
  commitments: ZkCommitmentStats;
  nullifiers: ZkNullifierStats;
  merkle: ZkMerkleStats;
  proofs: ZkProofStats;
  settlements: ZkSettlementStats;
  solana: ZkSolanaStatus;
  disclosure: ZkDisclosureStatus;
  keys: ZkKeyStatus;
  circuit: ZkCircuitStatus;
  groth16?: ZkGroth16Status;
  hash_chain?: ZkHashChainInfo;
  on_chain: { operator_address: string; latest_txs: ZkOnChainTx[] };
  system: {
    version: string;
    proof_real: boolean;
    proof_type: string;
    snark_ready: boolean;
    snark_circuit: string | null;
    snark_demo_ready?: boolean;
    snark_demo_circuit?: string | null;
    note: string;
  };
  fetched_at: string;
}

export interface ZkGroth16DemoResult {
  ok: boolean;
  scheme?: string;
  curve?: string;
  circuit?: string;
  preimage_used?: string;
  expected_hash?: string;
  proof?: unknown;
  public_signals?: string[];
  verified?: boolean;
  prove_ms?: number;
  verify_ms?: number;
  error?: string;
  hint?: string;
}

export interface ZkSolanaResponse {
  status: ZkSolanaStatus & { is_mainnet: boolean };
  funded?: { address: string; balance: number; airdropped: boolean; error?: string };
  config: { network: string; commitment: string };
  operator_address: string;
}

export interface ZkSettlementRecord {
  id: string;
  transfer_id: string;
  status: string;
  note_id: string | null;
  commitment: string | null;
  nullifier: string | null;
  proof_id: string | null;
  merkle_root_at_settlement: string | null;
  on_chain_tx_sig: string | null;
  on_chain_explorer_url: string | null;
  initiated_by_wallet: string | null;
  error_message: string | null;
  queued_at: string;
  submitted_on_chain_at: string | null;
  confirmed_at: string | null;
  finalized_at: string | null;
  settled_at: string | null;
  updated_at: string;
}

export interface WalletIdentity {
  id: string;
  wallet_address: string;
  identity_fingerprint: string;
  wallet_name: string | null;
  network_preference: string;
  first_seen_at: string;
  last_seen_at: string;
  session_count: number;
}

export interface WalletActivity {
  settlements: Array<{
    id: string;
    status: string;
    commitment: string | null;
    on_chain_tx_sig: string | null;
    on_chain_explorer_url: string | null;
    queued_at: string;
    finalized_at: string | null;
  }>;
  signing_requests: Array<{
    id: string;
    status: string;
    requested_at: string;
    responded_at: string | null;
  }>;
  onchain_txs: Array<{
    signature: string;
    status: string;
    explorer_url: string | null;
    submitted_at: string;
  }>;
}

export const api = {
  transfers: {
    list: (wallet?: string) =>
      fetchJson<Transfer[]>(
        wallet ? `/api/transfers?wallet=${encodeURIComponent(wallet)}` : "/api/transfers",
      ),
    get: (id: string) => fetchJson<Transfer>(`/api/transfers/${id}`),
    create: (body: Partial<Transfer> & { asset: string; walletAddress?: string }) =>
      fetchJson<Transfer>("/api/transfers", { method: "POST", body: JSON.stringify(body) }),
    updateStatus: (id: string, body: { status?: string; proofState?: string }) =>
      fetchJson<Transfer>(`/api/transfers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  payroll: {
    list: (wallet?: string) =>
      fetchJson<PayrollBatch[]>(
        wallet ? `/api/payroll?wallet=${encodeURIComponent(wallet)}` : "/api/payroll",
      ),
    get: (id: string) => fetchJson<PayrollBatch>(`/api/payroll/${id}`),
    create: (body: Partial<PayrollBatch> & { name: string; walletAddress?: string }) =>
      fetchJson<PayrollBatch>("/api/payroll", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<PayrollBatch>) =>
      fetchJson<PayrollBatch>(`/api/payroll/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  treasury: {
    list: (wallet?: string) =>
      fetchJson<TreasuryRoute[]>(
        wallet ? `/api/treasury?wallet=${encodeURIComponent(wallet)}` : "/api/treasury",
      ),
    create: (
      body: Partial<TreasuryRoute> & {
        name: string;
        source: string;
        destination: string;
        walletAddress?: string;
      },
    ) => fetchJson<TreasuryRoute>("/api/treasury", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<TreasuryRoute>) =>
      fetchJson<TreasuryRoute>(`/api/treasury/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  counterparties: {
    list: (wallet?: string, status?: string) => {
      const params = new URLSearchParams();
      if (wallet) params.set("wallet", wallet);
      if (status && status !== "all") params.set("status", status);
      const qs = params.toString();
      return fetchJson<Counterparty[]>(`/api/counterparties${qs ? "?" + qs : ""}`);
    },
    create: (body: Partial<Counterparty> & { name: string; createdByWallet?: string }) =>
      fetchJson<Counterparty>("/api/counterparties", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<Counterparty>) =>
      fetchJson<Counterparty>(`/api/counterparties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  activity: {
    list: (opts: { wallet?: string; category?: string; limit?: number } = {}) => {
      const params = new URLSearchParams();
      if (opts.wallet) params.set("wallet", opts.wallet);
      if (opts.category && opts.category !== "all") params.set("category", opts.category);
      if (opts.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return fetchJson<ActivityEvent[]>(`/api/activity${qs ? "?" + qs : ""}`);
    },
  },
  settings: {
    get: () => fetchJson<Settings>("/api/settings"),
    update: (body: Partial<Settings>) =>
      fetchJson<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  },
  dashboard: {
    get: (wallet?: string) =>
      fetchJson<DashboardStats & { walletScoped?: boolean }>(
        wallet ? `/api/dashboard?wallet=${encodeURIComponent(wallet)}` : "/api/dashboard",
      ),
  },
  zk: {
    system: () => fetchJson<ZkSystemInfo>("/api/zk/system"),
    notes: () => fetchJson<{ stats: ZkNoteStats; notes: unknown[] }>("/api/zk/notes"),
    commitments: () =>
      fetchJson<{ stats: ZkCommitmentStats; commitments: unknown[] }>("/api/zk/commitments"),
    nullifiers: () =>
      fetchJson<{ stats: ZkNullifierStats; nullifiers: unknown[] }>("/api/zk/nullifiers"),
    proofs: () => fetchJson<{ stats: ZkProofStats; proofs: unknown[] }>("/api/zk/proofs"),
    settlement: {
      queue: () =>
        fetchJson<{ stats: ZkSettlementStats; queue: ZkSettlementRecord[] }>(
          "/api/zk/settlement/queue",
        ),
      initiate: (body: {
        transfer_id: string;
        value: number;
        asset?: string;
        recipient_fingerprint: string;
        memo?: string;
        initiated_by_wallet?: string;
      }) =>
        fetchJson<{ settlement_id: string; status: string }>("/api/zk/settlement/initiate", {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    tx: {
      prepare: (body: { settlement_id: string; wallet_address: string }) =>
        fetchJson<{
          request_id: string;
          serialized_tx: string;
          network: string;
          is_mainnet: boolean;
          memo_text: string;
          expires_at: string;
          status: string;
        }>("/api/zk/tx/prepare", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      confirm: (body: {
        request_id: string;
        tx_signature: string;
        wallet_address: string;
        network: string;
      }) =>
        fetchJson<{ success: boolean; tx_signature: string; explorer_url: string; status: string }>(
          "/api/zk/tx/confirm",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        ),
    },
    solana: () => fetchJson<ZkSolanaResponse>("/api/zk/solana"),
    keys: () => fetchJson<{ keys: unknown; note: string }>("/api/zk/keys"),
    disclosure: () => fetchJson<ZkDisclosureStatus>("/api/zk/disclosure"),
    groth16: {
      status: () => fetchJson<ZkGroth16Status>("/api/zk/groth16/status"),
      demo: (opts: { adminKey: string; preimage?: string }) => {
        const qs = new URLSearchParams();
        if (opts.preimage) qs.set("preimage", opts.preimage);
        const url = `/api/zk/groth16/demo${qs.toString() ? "?" + qs.toString() : ""}`;
        return fetchJson<ZkGroth16DemoResult>(url, {
          headers: { "Content-Type": "application/json", "x-admin-key": opts.adminKey },
        });
      },
    },
  },
  identity: {
    resolve: (wallet_address: string, wallet_name?: string) =>
      fetchJson<{ identity: WalletIdentity }>("/api/identity/resolve", {
        method: "POST",
        body: JSON.stringify({ wallet_address, wallet_name }),
      }),
    get: (address: string) =>
      fetchJson<{ identity: WalletIdentity; activity: WalletActivity }>(`/api/identity/${address}`),
  },
};
