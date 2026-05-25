export type MaterialRequestStatus =
  | "DRAFT"
  | "PENDING_CTO_APPROVAL"
  | "APPROVED_BY_CTO"
  | "REJECTED_BY_CTO"
  | "RETURNED_FOR_ADJUSTMENT"
  | "CANCELLED";

export type CtoDecision =
  | "APPROVE"
  | "REJECT"
  | "RETURN_FOR_ADJUSTMENT";
