export type MaterialRequestStatus =
  | "DRAFT"
  | "PENDING_LAMINATION_MANAGER_APPROVAL"
  | "PENDING_CTO_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED_FOR_ADJUSTMENT"
  | "CANCELLED";

export type MaterialRequestDecision = "APPROVE" | "REJECT" | "RETURN_FOR_ADJUSTMENT";
export type ApproverRole = "LAMINATION_MANAGER" | "CTO";
export type CtoDecision = MaterialRequestDecision;
