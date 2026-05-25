import type { MaterialRequestDecision } from "./status";
import type { StockRecommendation } from "./stockTypes";

export function requiresRequesterJustification(recommendation: StockRecommendation): boolean {
  return recommendation === "PURCHASE_NOT_RECOMMENDED" || recommendation === "MANUAL_REVIEW_REQUIRED";
}

export function requiresApproverJustificationOnDecision(input: {
  recommendation: StockRecommendation;
  decision: MaterialRequestDecision;
}): boolean {
  return input.decision === "APPROVE" && requiresRequesterJustification(input.recommendation);
}

export const requiresCtoJustificationOnDecision = requiresApproverJustificationOnDecision;
