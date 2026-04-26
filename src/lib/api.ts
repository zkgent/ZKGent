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
  recentActivity: { id: string; category: string; event: string; detail: string; operator: string; status: string; createdAt: string }[];
}

export const api = {
  transfers: {
    list: () => fetchJson<Transfer[]>("/api/transfers"),
    get: (id: string) => fetchJson<Transfer>(`/api/transfers/${id}`),
    create: (body: Partial<Transfer> & { asset: string }) => fetchJson<Transfer>("/api/transfers", { method: "POST", body: JSON.stringify(body) }),
    updateStatus: (id: string, body: { status?: string; proofState?: string }) =>
      fetchJson<Transfer>(`/api/transfers/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  payroll: {
    list: () => fetchJson<PayrollBatch[]>("/api/payroll"),
    get: (id: string) => fetchJson<PayrollBatch>(`/api/payroll/${id}`),
    create: (body: Partial<PayrollBatch> & { name: string }) => fetchJson<PayrollBatch>("/api/payroll", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<PayrollBatch>) => fetchJson<PayrollBatch>(`/api/payroll/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  treasury: {
    list: () => fetchJson<TreasuryRoute[]>("/api/treasury"),
    create: (body: Partial<TreasuryRoute> & { name: string; source: string; destination: string }) =>
      fetchJson<TreasuryRoute>("/api/treasury", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<TreasuryRoute>) =>
      fetchJson<TreasuryRoute>(`/api/treasury/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  counterparties: {
    list: (status?: string) => fetchJson<Counterparty[]>(`/api/counterparties${status && status !== "all" ? `?status=${status}` : ""}`),
    create: (body: Partial<Counterparty> & { name: string }) =>
      fetchJson<Counterparty>("/api/counterparties", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Counterparty>) =>
      fetchJson<Counterparty>(`/api/counterparties/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  activity: {
    list: (category?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (category && category !== "all") params.set("category", category);
      if (limit) params.set("limit", String(limit));
      const qs = params.toString();
      return fetchJson<ActivityEvent[]>(`/api/activity${qs ? "?" + qs : ""}`);
    },
  },
  settings: {
    get: () => fetchJson<Settings>("/api/settings"),
    update: (body: Partial<Settings>) => fetchJson<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  },
  dashboard: {
    get: () => fetchJson<DashboardStats>("/api/dashboard"),
  },
};
