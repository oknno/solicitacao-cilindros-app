import type { MaterialRequestStatus } from "./status";

export type MaterialRequestHistoryAction =
  | "CREATED"
  | "SUBMITTED"
  | "APPROVED_BY_CTO"
  | "REJECTED_BY_CTO"
  | "RETURNED_FOR_ADJUSTMENT"
  | "CANCELLED"
  | "UPDATED";

export interface MaterialRequestHistoryEntry {
  id?: number;
  requestId: number;
  action: MaterialRequestHistoryAction;
  previousStatus?: MaterialRequestStatus;
  newStatus: MaterialRequestStatus;
  performedByName: string;
  performedByEmail?: string;
  performedAt: string;
  comment?: string;
}
