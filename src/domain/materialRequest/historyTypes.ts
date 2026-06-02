import type { ReadableMaterialRequestStatus } from "./status";

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
  | "UPDATED"
  | "DELETED"
  | "STATUS_RETURNED"
  | "STATUS_RETURNED_TO_DRAFT";

export interface MaterialRequestHistoryEntry {
  id?: number;
  requestId: number;
  action: MaterialRequestHistoryAction;
  previousStatus?: ReadableMaterialRequestStatus;
  newStatus: ReadableMaterialRequestStatus;
  performedByName: string;
  performedByEmail?: string;
  performedAt: string;
  comment?: string;
}
