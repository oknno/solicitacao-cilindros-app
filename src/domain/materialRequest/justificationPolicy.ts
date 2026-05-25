import type { CtoDecision } from "./status";
import type { StockRecommendation } from "./stockTypes";

export function requiresRequesterJustification(
  recommendation: StockRecommendation,
): boolean {
  if (recommendation === "PURCHASE_RECOMMENDED") {
    return false;
  }

  if (recommendation === "PURCHASE_RECOMMENDED_PARTIAL_STOCK") {
    return false;
  }

  return true;
}

export function requiresCtoJustificationOnDecision(input: {
  recommendation: StockRecommendation;
  decision: CtoDecision;
}): boolean {
  if (input.decision !== "APPROVE") {
    return false;
  }

  if (input.recommendation === "PURCHASE_NOT_RECOMMENDED") {
    return true;
  }

  if (input.recommendation === "MANUAL_REVIEW_REQUIRED") {
    return true;
  }

  return false;
}
