import type { ProviderDefinition, QueryMode, QueryResult } from "@query402/shared";

export interface PaidQueryResponse {
  payment: {
    network: string;
    facilitatorUrl: string;
    paymentResponseHeader: string | null;
  };
  result: QueryResult;
}

export interface AnalyticsResponse {
  totalQueries: number;
  totalSpendUsd: number;
  spendByCategory: Record<QueryMode, number>;
  recentTransactions: Array<{
    id: string;
    amountUsd: number;
    endpoint: string;
    providerId: string;
    status: string;
    createdAt: string;
  }>;
  recentUsage: Array<{
    id: string;
    mode: QueryMode;
    providerId: string;
    priceUsd: number;
    createdAt: string;
    latencyMs: number;
    paymentStatus: string;
    traceId: string;
  }>;
}

export type ProviderMap = Record<QueryMode, ProviderDefinition[]>;

export interface HealthResponse {
  ok: boolean;
  demoMode?: boolean;
  sponsorshipEnabled?: boolean;
}

export type EvidenceStatus = "pass" | "warn" | "pending";

export interface EvidenceCheckItem {
  id: string;
  label: string;
  status: EvidenceStatus;
  detail?: string;
}
