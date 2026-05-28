import type { MaterialRequestStatus } from "../materialRequest/status";
import type { StockRecommendation } from "../materialRequest/stockTypes";

export type MaterialDashboardSeverity = "HIGH" | "MEDIUM" | "LOW";

export type MaterialDashboardAttentionLabel =
  | "Estoque zerado com consumo"
  | "Estoque baixo"
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
}

export interface DashboardAttentionMaterial extends DashboardStockRankingItem {
  attentionLabels: MaterialDashboardAttentionLabel[];
  severity: MaterialDashboardSeverity;
}

export interface MaterialDashboardResult {
  kpis: MaterialDashboardKpis;
  openRequests: DashboardOpenRequest[];
  attentionMaterials: DashboardAttentionMaterial[];
  stockItems: DashboardStockRankingItem[];
  topStockValueItems: DashboardStockRankingItem[];
  topCoverageItems: DashboardStockRankingItem[];
  centerOptions: string[];
}
