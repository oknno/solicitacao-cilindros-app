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
  totalStockValueBRL: number | null;
  consumption2021: number | null;
  consumption2022: number | null;
  consumption2023: number | null;
  consumption2024: number | null;
  consumption2025: number | null;
  consumption2026: number | null;
  historicalTotal: number | null;
  consumptionYearsCount: number | null;
  averageAnnualConsumption: number | null;
  averagePrice: number | null;
}

export interface StockAnalysisResult {
  materialFound: boolean;
  recommendation: StockRecommendation;
  evaluatedStockTotal: number | null;
  requestedQuantity: number;
  requiresRequesterJustification: boolean;
  message: string;
}
