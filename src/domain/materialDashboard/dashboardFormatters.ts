import type { MaterialRequestStatus } from "../materialRequest/status";
import type { StockRecommendation } from "../materialRequest/stockTypes";

const MATERIAL_REQUEST_STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  DRAFT: "Rascunho",
  PENDING_LAMINATION_MANAGER_APPROVAL: "Pendente Gerente Laminação",
  PENDING_CTO_APPROVAL: "Pendente CTO",
  RETURNED_FOR_ADJUSTMENT: "Devolvida",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
  CANCELLED: "Cancelada",
};

const STOCK_RECOMMENDATION_LABELS: Record<StockRecommendation, string> = {
  PURCHASE_RECOMMENDED: "Compra recomendada",
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial",
  PURCHASE_NOT_RECOMMENDED: "Compra não recomendada",
  MANUAL_REVIEW_REQUIRED: "Requer análise manual",
};

export function formatDashboardRequestStatus(status: MaterialRequestStatus): string {
  return MATERIAL_REQUEST_STATUS_LABELS[status] ?? status;
}

export function formatDashboardStockRecommendation(recommendation: StockRecommendation): string {
  return STOCK_RECOMMENDATION_LABELS[recommendation] ?? recommendation;
}
