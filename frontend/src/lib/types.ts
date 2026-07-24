export type DisputeStage = "NOT_DISPUTED" | "UNDER_REVIEW" | "FILING" | "FILED" | "RESOLVED";

export interface Company {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Dispute {
  id: number;
  stage: DisputeStage;
  recoveredAmount: number | null;
  recoveryAmountKnown: boolean;
  resolutionOutcome: string | null;
  updatedAt: string;
}

export interface Deduction {
  sourceId: string;
  companyId: number | null;
  companyName: string | null;
  retailerId: number | null;
  retailerName: string | null;
  retailerNameRaw: string | null;
  reasonCode: string | null;
  reasonLabel: string | null;
  reasonCategory: string | null;
  reasonRaw: string | null;
  typicallyDisputable: boolean | null;
  invoiceNumber: string | null;
  amount: number | null;
  deductedAt: string | null;
  notes: string | null;
  flags: string[];
  dispute: Dispute | null;
}

export interface RecoverySummary {
  disputeCount: number;
  disputedAmount: number;
  recoveredAmount: number;
  knownRecoveryDisputedAmount: number;
  recoveryRate: number | null;
  unknownRecoveryCount: number;
  byStage: { stage: DisputeStage; count: number; amount: number }[];
  byRetailer: {
    retailerName: string;
    disputeCount: number;
    disputedAmount: number;
    recoveredAmount: number;
    recoveryRate: number | null;
  }[];
}

export interface DisputeEvent {
  id: number;
  dispute_id: number;
  from_stage: DisputeStage | null;
  to_stage: DisputeStage;
  note: string | null;
  recovered_amount: number | null;
  created_at: string;
}
