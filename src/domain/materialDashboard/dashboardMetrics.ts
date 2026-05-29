import type { MaterialRequest } from "../materialRequest/types";
import type { StockMaterial } from "../materialRequest/stockTypes";

const HIGH_COVERAGE_YEARS = 5;
const HIGH_IDLE_STOCK_VALUE_BRL = 500_000;

export function toDashboardNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function calculateCoverageYears(input: Pick<StockMaterial, "evaluatedStockTotal" | "averageAnnualConsumption">): number | null {
  const averageAnnualConsumption = toDashboardNumber(input.averageAnnualConsumption);
  if (averageAnnualConsumption === 0) return null;

  return toDashboardNumber(input.evaluatedStockTotal) / averageAnnualConsumption;
}

export function calculateTotalStockValueBRL(input: Pick<StockMaterial, "evaluatedStockTotal" | "averagePrice" | "totalStockValueBRL">): number {
  if (typeof input.totalStockValueBRL === "number" && Number.isFinite(input.totalStockValueBRL)) {
    return input.totalStockValueBRL;
  }

  return toDashboardNumber(input.evaluatedStockTotal) * toDashboardNumber(input.averagePrice);
}

export function isZeroStock(input: Pick<StockMaterial, "evaluatedStockTotal">): boolean {
  return toDashboardNumber(input.evaluatedStockTotal) === 0;
}

export function isLowCoverage(input: Pick<StockMaterial, "evaluatedStockTotal" | "averageAnnualConsumption">): boolean {
  const coverageYears = calculateCoverageYears(input);
  return toDashboardNumber(input.evaluatedStockTotal) > 0 && coverageYears !== null && coverageYears <= 1;
}

export function isFrequentUseWithLowStock(input: Pick<StockMaterial, "averageAnnualConsumption" | "consumptionYearsCount" | "evaluatedStockTotal">): boolean {
  const coverageYears = calculateCoverageYears(input);
  const consumptionYearsCount = toDashboardNumber(input.consumptionYearsCount);
  const hasRecurringConsumption = consumptionYearsCount >= 3 || toDashboardNumber(input.averageAnnualConsumption) > 0;
  return hasRecurringConsumption && coverageYears !== null && coverageYears <= 1;
}

export function isHighCoverage(coverageYears: number | null): boolean {
  return coverageYears !== null && coverageYears > HIGH_COVERAGE_YEARS;
}

export function hasNoHistoricalConsumption(input: Pick<StockMaterial, "historicalTotal" | "averageAnnualConsumption">): boolean {
  return toDashboardNumber(input.historicalTotal) === 0 || toDashboardNumber(input.averageAnnualConsumption) === 0;
}

export function isZeroStockWithConsumption(input: Pick<StockMaterial, "evaluatedStockTotal" | "historicalTotal">): boolean {
  return toDashboardNumber(input.evaluatedStockTotal) === 0 && toDashboardNumber(input.historicalTotal) > 0;
}

export function isHighIdleStock(input: Pick<StockMaterial, "evaluatedStockTotal" | "averagePrice" | "totalStockValueBRL" | "historicalTotal"> & { coverageYears: number | null }): boolean {
  const totalStockValueBRL = calculateTotalStockValueBRL(input);
  return totalStockValueBRL >= HIGH_IDLE_STOCK_VALUE_BRL && (isHighCoverage(input.coverageYears) || toDashboardNumber(input.historicalTotal) === 0);
}

export function hasOpenRequestWithAvailableStock(input: {
  material: Pick<StockMaterial, "evaluatedStockTotal">;
  openRequests: Pick<MaterialRequest, "requestedQuantity">[];
}): boolean {
  const evaluatedStockTotal = toDashboardNumber(input.material.evaluatedStockTotal);
  return input.openRequests.some((request) => evaluatedStockTotal >= toDashboardNumber(request.requestedQuantity));
}

export const materialDashboardMetricThresholds = {
  HIGH_COVERAGE_YEARS,
  HIGH_IDLE_STOCK_VALUE_BRL,
} as const;
