import { calculateCoverageYears, calculateTotalStockValueBRL, toDashboardNumber } from "../materialDashboard/dashboardMetrics";
import type { StockMaterial } from "./stockTypes";

export interface MaterialRequestStockImpactMetrics {
  currentStock: number;
  averagePrice: number;
  currentStockValue: number;
  historicalTotalConsumption: number;
  consumptionYearsCount: number;
  averageAnnualConsumption: number;
  currentCoverageYears: number | null;
  projectedStock: number;
  absoluteIncrease: number;
  percentageIncrease: number | null;
  estimatedRequestValue: number;
  projectedStockValue: number;
  projectedCoverageYears: number | null;
  coverageVariationYears: number | null;
}

export function calculateMaterialRequestStockImpact(
  material: StockMaterial | null | undefined,
  requestedQuantity: number | null | undefined,
): MaterialRequestStockImpactMetrics {
  const currentStock = toDashboardNumber(material?.evaluatedStockTotal);
  const averagePrice = toDashboardNumber(material?.averagePrice);
  const quantity = toDashboardNumber(requestedQuantity);
  const projectedStock = currentStock + quantity;
  const currentCoverageYears = material ? calculateCoverageYears(material) : null;
  const projectedCoverageYears = material
    ? calculateCoverageYears({ ...material, evaluatedStockTotal: projectedStock })
    : null;

  return {
    currentStock,
    averagePrice,
    currentStockValue: material
      ? calculateTotalStockValueBRL(material)
      : currentStock * averagePrice,
    historicalTotalConsumption: toDashboardNumber(material?.historicalTotal),
    consumptionYearsCount: toDashboardNumber(material?.consumptionYearsCount),
    averageAnnualConsumption: toDashboardNumber(material?.averageAnnualConsumption),
    currentCoverageYears,
    projectedStock,
    absoluteIncrease: quantity,
    percentageIncrease: currentStock > 0 ? quantity / currentStock : null,
    estimatedRequestValue: quantity * averagePrice,
    projectedStockValue: projectedStock * averagePrice,
    projectedCoverageYears,
    coverageVariationYears: currentCoverageYears !== null && projectedCoverageYears !== null
      ? projectedCoverageYears - currentCoverageYears
      : null,
  };
}
