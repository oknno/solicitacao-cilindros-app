import type { MaterialRequestStatus } from "../materialRequest/status";
import type { StockRecommendation } from "../materialRequest/stockTypes";

export type MaterialDashboardSeverity = "HIGH" | "MEDIUM" | "LOW";

export type MaterialDashboardAttentionLabel =
  | "Estoque zerado com consumo"
  | "Uso frequente com estoque baixo"
  | "Cobertura baixa"
  | "Cobertura elevada"
  | "Valor alto parado"
  | "Sem consumo histórico"
  | "Solicitação aberta com estoque disponível";

export interface MaterialDashboardKpis {
  openRequestsCount: number;
  pendingLaminationManagerCount: number;
  pendingCtoCount: number;
  zeroStockMaterialsCount: number;
  totalStockValueBRL: number;
  highCoverageMaterialsCount: number;
}

export interface DashboardOpenRequest {
  id: number | null;
  center: string;
  material: string;
  description: string;
  requestedQuantity: number;
  evaluatedStockTotal: number | null;
  averagePrice: number;
  averageAnnualConsumption: number;
  projectedStockTotal: number;
  estimatedRequestedValueBRL: number;
  requestedStockRatio: number | null;
  currentCoverageYears: number | null;
  coverageAfterRequestYears: number | null;
  coverageIncreaseYears: number | null;
  materialFound: boolean;
  stockRecommendation: StockRecommendation;
  stockRecommendationLabel: string;
  requestStatus: MaterialRequestStatus;
  requestStatusLabel: string;
  requesterName: string;
  requesterEmail?: string;
  daysOpen: number | null;
}

export interface DashboardStockRankingItem {
  center: string;
  material: string;
  description: string;
  evaluatedStockTotal: number;
  averagePrice: number;
  totalStockValueBRL: number;
  averageAnnualConsumption: number;
  coverageYears: number | null;
  historicalTotal: number;
  consumptionYearsCount: number;
}

export interface DashboardAttentionMaterial extends DashboardStockRankingItem {
  attentionLabels: MaterialDashboardAttentionLabel[];
  severity: MaterialDashboardSeverity;
}

export interface MaterialDashboardResult {
  kpis: MaterialDashboardKpis;
  requests: DashboardOpenRequest[];
  openRequests: DashboardOpenRequest[];
  attentionMaterials: DashboardAttentionMaterial[];
  stockItems: DashboardStockRankingItem[];
  topStockValueItems: DashboardStockRankingItem[];
  topCoverageItems: DashboardStockRankingItem[];
  centerOptions: string[];
}
