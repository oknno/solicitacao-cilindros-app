import type { MaterialRequestStatus } from "./status";

export type MaterialRequestHistoryAction =
  | "CREATED"
  | "SUBMITTED"
  | "APPROVED_BY_LAMINATION_MANAGER"
  | "REJECTED_BY_LAMINATION_MANAGER"
  | "RETURNED_BY_LAMINATION_MANAGER"
  | "APPROVED_BY_CTO"
  | "REJECTED_BY_CTO"
  | "RETURNED_BY_CTO"
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
