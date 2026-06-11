import type { ReadableMaterialRequestStatus } from "../../../domain/materialRequest/status";
import type { StockRecommendation } from "../../../domain/materialRequest/stockTypes";

export function formatEmpty(value: unknown): string {
  if (value == null) return "-";
  const text = String(value).trim();
  return text.length ? text : "-";
}

export function formatMaterialRequestStatusLabel(status?: ReadableMaterialRequestStatus | string): string {
  const labels: Record<ReadableMaterialRequestStatus, string> = {
    DRAFT: "Rascunho",
    RETURNED_TO_DRAFT: "Retornado para Rascunho",
    PENDING_LAMINATION_MANAGER_APPROVAL: "Pendente Gerente Laminação",
    PENDING_CTO_APPROVAL: "Pendente CTO",
    APPROVED: "Aprovada",
    REJECTED: "Reprovada",
    RETURNED_FOR_ADJUSTMENT: "Reprovada",
    CANCELLED: "Cancelada",
  };

  if (!status) return "-";
  return labels[status as ReadableMaterialRequestStatus] ?? status;
}

export function formatStockRecommendationLabel(recommendation?: StockRecommendation): string {
  const labels: Record<StockRecommendation, string> = {
    PURCHASE_RECOMMENDED: "Compra recomendada",
    PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial",
    PURCHASE_NOT_RECOMMENDED: "Compra não recomendada",
    MANUAL_REVIEW_REQUIRED: "Requer análise manual",
  };

  if (!recommendation) return "-";
  return labels[recommendation] ?? recommendation;
}

export function formatNumber(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("pt-BR");
}

export function formatDateTime(value?: string | null): string {
  if (typeof value !== "string" || !value.trim()) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDecisionLabel(status?: ReadableMaterialRequestStatus): string {
  if (!status) return "-";
  if (status === "APPROVED") return "Aprovada";
  if (status === "REJECTED") return "Reprovada";
  if (status === "RETURNED_FOR_ADJUSTMENT") return "Reprovada";
  if (status === "CANCELLED") return "Cancelada";
  return "Pendente";
}
