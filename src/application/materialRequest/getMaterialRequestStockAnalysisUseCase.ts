import type { MaterialRequest, StockMaterial } from "../../domain/materialRequest";
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

function asNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeRequestedQuantity(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function shouldSkipStockLookup(request: MaterialRequest): boolean {
  return request.stockRecommendation === "MANUAL_REVIEW_REQUIRED" && request.evaluatedStockTotalAtRequest === null;
}

function buildAnalysis(stockMaterial: StockMaterial, requestedQuantity: number | null): MaterialRequestStockAnalysisMetrics {
  const evaluatedStock = asNumber(stockMaterial.evaluatedStockTotal);
  const averageAnnualConsumption = asNumber(stockMaterial.averageAnnualConsumption);
  const projectedStockAfterRequest = requestedQuantity === null ? null : evaluatedStock + requestedQuantity;
  const requestedPercentOnStock = evaluatedStock > 0 && requestedQuantity !== null ? (requestedQuantity / evaluatedStock) * 100 : null;
  const coverageYears = averageAnnualConsumption > 0 ? evaluatedStock / averageAnnualConsumption : null;

  return {
    evaluatedStock,
    requestedQuantity,
    projectedStockAfterRequest,
    requestedPercentOnStock,
    averageAnnualConsumption,
    coverageYears,
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
