import type { MaterialRequestStatus } from "./status";
import type { StockRecommendation } from "./stockTypes";

export interface MaterialRequest {
  id?: number;
  title?: string;

  requesterName: string;
  requesterEmail?: string;

  unit?: string;
  area?: string;

  materialCode: string;
  materialDescription: string;
  unitOfMeasure?: string;
  center: string;

  requestedQuantity: number;
  needDate?: string;

  requestReason: string;
  urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  evaluatedStockTotalAtRequest: number | null;
  stockRecommendation: StockRecommendation;

  requesterJustification?: string;
  ctoJustification?: string;

  status: MaterialRequestStatus;

  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;

  ctoApproverName?: string;
  ctoApproverEmail?: string;
  ctoDecisionDate?: string;
}
