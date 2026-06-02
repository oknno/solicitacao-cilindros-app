export type MaterialRequestStatus =
  | "DRAFT"
  | "RETURNED_TO_DRAFT"
  | "PENDING_LAMINATION_MANAGER_APPROVAL"
  | "PENDING_CTO_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type LegacyMaterialRequestStatus = "RETURNED_FOR_ADJUSTMENT" | "CANCELLED";
export type ReadableMaterialRequestStatus = MaterialRequestStatus | LegacyMaterialRequestStatus;

export type MaterialRequestDecision = "APPROVE" | "REJECT";
export type ApproverRole = "LAMINATION_MANAGER" | "CTO";
export type CtoDecision = MaterialRequestDecision;

const OFFICIAL_STATUSES = new Set<MaterialRequestStatus>([
  "DRAFT",
  "RETURNED_TO_DRAFT",
  "PENDING_LAMINATION_MANAGER_APPROVAL",
  "PENDING_CTO_APPROVAL",
  "APPROVED",
  "REJECTED",
]);

export function normalizeMaterialRequestStatus(status: string): MaterialRequestStatus {
  if (status === "RETURNED_FOR_ADJUSTMENT") return "REJECTED";
  if (status === "CANCELLED") return "APPROVED";
  if (OFFICIAL_STATUSES.has(status as MaterialRequestStatus)) return status as MaterialRequestStatus;
  return "APPROVED";
}
