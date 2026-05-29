import type { MaterialRequest } from "../materialRequest/types";
import type { StockMaterial } from "../materialRequest/stockTypes";
import type { MaterialDashboardAttentionLabel, MaterialDashboardSeverity } from "./dashboardTypes";
import {
  calculateCoverageYears,
  calculateTotalStockValueBRL,
  hasNoHistoricalConsumption,
  hasOpenRequestWithAvailableStock,
  isHighCoverage,
  isFrequentUseWithLowStock,
  isHighIdleStock,
  isLowCoverage,
  isZeroStockWithConsumption,
  materialDashboardMetricThresholds,
} from "./dashboardMetrics";

const HIGH_IDLE_STOCK_VALUE_FOR_HIGH_SEVERITY_BRL = 1_000_000;
const RELEVANT_STOCK_VALUE_BRL = 500_000;
const VERY_HIGH_COVERAGE_YEARS = 10;

export interface EvaluateStockAttentionInput {
  material: StockMaterial;
  relatedOpenRequests: MaterialRequest[];
}

export interface StockAttentionResult {
  attentionLabels: MaterialDashboardAttentionLabel[];
  severity: MaterialDashboardSeverity | null;
}

function calculateSeverity(input: {
  labels: MaterialDashboardAttentionLabel[];
  totalStockValueBRL: number;
  coverageYears: number | null;
}): MaterialDashboardSeverity | null {
  if (input.labels.length === 0) return null;

  if (
    input.labels.includes("Estoque zerado com consumo") ||
    input.labels.includes("Uso frequente com estoque baixo") ||
    (input.labels.includes("Valor alto parado") && input.totalStockValueBRL >= HIGH_IDLE_STOCK_VALUE_FOR_HIGH_SEVERITY_BRL) ||
    (input.coverageYears !== null && input.coverageYears > VERY_HIGH_COVERAGE_YEARS && input.totalStockValueBRL >= RELEVANT_STOCK_VALUE_BRL)
  ) {
    return "HIGH";
  }

  if (
    input.labels.includes("Cobertura baixa") ||
    (input.coverageYears !== null && input.coverageYears > materialDashboardMetricThresholds.HIGH_COVERAGE_YEARS) ||
    (input.labels.includes("Sem consumo histórico") && input.totalStockValueBRL >= RELEVANT_STOCK_VALUE_BRL)
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

export function evaluateStockAttention(input: EvaluateStockAttentionInput): StockAttentionResult {
  const { material, relatedOpenRequests } = input;
  const coverageYears = calculateCoverageYears(material);
  const totalStockValueBRL = calculateTotalStockValueBRL(material);
  const labels: MaterialDashboardAttentionLabel[] = [];

  if (isZeroStockWithConsumption(material)) labels.push("Estoque zerado com consumo");
  if (isFrequentUseWithLowStock(material)) labels.push("Uso frequente com estoque baixo");
  if (isLowCoverage(material)) labels.push("Cobertura baixa");
  if (isHighCoverage(coverageYears)) labels.push("Cobertura elevada");
  if (isHighIdleStock({ ...material, coverageYears })) labels.push("Valor alto parado");
  if (hasNoHistoricalConsumption(material)) labels.push("Sem consumo histórico");
  if (hasOpenRequestWithAvailableStock({ material, openRequests: relatedOpenRequests })) {
    labels.push("Solicitação aberta com estoque disponível");
  }

  return {
    attentionLabels: labels,
    severity: calculateSeverity({ labels, totalStockValueBRL, coverageYears }),
  };
}
