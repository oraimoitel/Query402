import type { ProviderDefinition, QueryMode, QueryResult } from "@query402/shared";

export interface PaymentProofLinks {
  transaction: string;
  payer: string;
  payTo: string;
  network: string;
  asset: string;
}

export interface PaymentEvidenceSummary {
  kind: string;
  status: string;
  network: string;
  asset?: string;
  amount?: string;
  payTo: string;
  facilitatorUrl: string;
  payer?: string;
  transactionHash?: string;
  proofLinks: PaymentProofLinks;
}

export interface PaidQueryResponse {
  payment: {
    network: string;
    facilitatorUrl: string;
    paymentResponseHeader: string | null;
    evidence?: PaymentEvidenceSummary;
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
    transactionHash?: string;
    payerPublicKey?: string;
    payToAddress?: string;
    network: string;
    asset?: string;
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
