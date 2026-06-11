import { calculateMaterialRequestStockImpact, type MaterialRequest, type StockMaterial } from "../../domain/materialRequest";
import { findStockMaterialByCenterAndCode } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface MaterialRequestStockAnalysisMetrics {
  evaluatedStock: number;
  requestedQuantity: number | null;
  projectedStockAfterRequest: number | null;
  requestedPercentOnStock: number | null;
  averageAnnualConsumption: number;
  coverageYears: number | null;
}

export interface MaterialRequestStockAnalysisOutput {
  stockMaterial: StockMaterial | null;
  requestedQuantity: number | null;
  analysis: MaterialRequestStockAnalysisMetrics | null;
}

function normalizeRequestedQuantity(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function shouldSkipStockLookup(request: MaterialRequest): boolean {
  return request.stockRecommendation === "MANUAL_REVIEW_REQUIRED" && request.evaluatedStockTotalAtRequest === null;
}

function buildAnalysis(stockMaterial: StockMaterial, requestedQuantity: number | null): MaterialRequestStockAnalysisMetrics {
  const impact = calculateMaterialRequestStockImpact(stockMaterial, requestedQuantity);

  return {
    evaluatedStock: impact.currentStock,
    requestedQuantity,
    projectedStockAfterRequest: requestedQuantity === null ? null : impact.projectedStock,
    requestedPercentOnStock: impact.percentageIncrease === null ? null : impact.percentageIncrease * 100,
    averageAnnualConsumption: impact.averageAnnualConsumption,
    coverageYears: impact.currentCoverageYears,
  };
}

export async function getMaterialRequestStockAnalysisUseCase(
  request: MaterialRequest,
): Promise<MaterialRequestStockAnalysisOutput> {
  const requestedQuantity = normalizeRequestedQuantity(request.requestedQuantity);

  if (shouldSkipStockLookup(request)) {
    return { stockMaterial: null, requestedQuantity, analysis: null };
  }

  const center = request.center?.trim();
  const materialCode = request.materialCode?.trim();
  if (!center || !materialCode) {
    return { stockMaterial: null, requestedQuantity, analysis: null };
  }

  const stockMaterial = await findStockMaterialByCenterAndCode({ center, materialCode });
  return {
    stockMaterial,
    requestedQuantity,
    analysis: stockMaterial ? buildAnalysis(stockMaterial, requestedQuantity) : null,
  };
}
