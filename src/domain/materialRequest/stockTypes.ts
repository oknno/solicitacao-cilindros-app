export type StockRecommendation =
  | "PURCHASE_RECOMMENDED"
  | "PURCHASE_RECOMMENDED_PARTIAL_STOCK"
  | "PURCHASE_NOT_RECOMMENDED"
  | "MANUAL_REVIEW_REQUIRED";

export interface StockMaterial {
  materialCode: string;
  description: string;
  center: string;
  evaluatedStockTotal: number | null;
}

export interface StockAnalysisResult {
  materialFound: boolean;
  recommendation: StockRecommendation;
  evaluatedStockTotal: number | null;
  requestedQuantity: number;
  requiresRequesterJustification: boolean;
  message: string;
}
