import { exportToExcel, type ExportExcelColumn } from "../../app/utils/exportExcel";
import type { MaterialRequest } from "../../domain/materialRequest/types";
import type { MaterialRequestStatus } from "../../domain/materialRequest/status";
import type { StockRecommendation } from "../../domain/materialRequest/stockTypes";

const STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  DRAFT: "Rascunho",
  PENDING_LAMINATION_MANAGER_APPROVAL: "Pendente Gerente Laminação",
  PENDING_CTO_APPROVAL: "Pendente CTO",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
  RETURNED_FOR_ADJUSTMENT: "Devolvida",
  CANCELLED: "Cancelada",
};

const STOCK_RECOMMENDATION_LABELS: Record<StockRecommendation, string> = {
  PURCHASE_RECOMMENDED: "Compra recomendada",
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial",
  PURCHASE_NOT_RECOMMENDED: "Compra não recomendada",
  MANUAL_REVIEW_REQUIRED: "Requer análise manual",
};

function toIsoDatePrefix(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function mapStatusLabel(status: MaterialRequest["status"]): string {
  return STATUS_LABELS[status as MaterialRequestStatus] ?? status ?? "";
}

function mapStockRecommendationLabel(recommendation: MaterialRequest["stockRecommendation"]): string {
  return STOCK_RECOMMENDATION_LABELS[recommendation as StockRecommendation] ?? recommendation ?? "";
}

const columns: ExportExcelColumn<MaterialRequest>[] = [
  { header: "ID", getValue: (item) => item.id ?? "" },
  { header: "Título", getValue: (item) => item.title ?? "" },
  { header: "Solicitante", getValue: (item) => item.requesterName },
  { header: "E-mail Solicitante", getValue: (item) => item.requesterEmail ?? "" },
  { header: "Centro", getValue: (item) => item.center },
  { header: "Material", getValue: (item) => item.materialCode },
  { header: "Descrição Material", getValue: (item) => item.materialDescription },
  { header: "Qtde. Solicitada", getValue: (item) => item.requestedQuantity },
  { header: "Estoque Avaliado", getValue: (item) => item.evaluatedStockTotalAtRequest ?? "" },
  { header: "Parecer Estoque", getValue: (item) => mapStockRecommendationLabel(item.stockRecommendation) },
  { header: "Motivo Solicitação", getValue: (item) => item.requestReason },
  { header: "Justificativa Solicitante", getValue: (item) => item.requesterJustification ?? "" },
  { header: "Status", getValue: (item) => mapStatusLabel(item.status) },
  { header: "Gerente Laminação", getValue: (item) => item.laminationManagerName ?? "" },
  { header: "E-mail Gerente Laminação", getValue: (item) => item.laminationManagerEmail ?? "" },
  { header: "Justificativa Gerente Laminação", getValue: (item) => item.laminationManagerJustification ?? "" },
  { header: "Data Decisão Gerente Laminação", getValue: (item) => item.laminationManagerDecisionDate ?? "" },
  { header: "Aprovador CTO", getValue: (item) => item.ctoApproverName ?? "" },
  { header: "E-mail CTO", getValue: (item) => item.ctoApproverEmail ?? "" },
  { header: "Justificativa CTO", getValue: (item) => item.ctoJustification ?? "" },
  { header: "Data Decisão CTO", getValue: (item) => item.ctoDecisionDate ?? "" },
  { header: "Criado em", getValue: (item) => item.createdAt ?? "" },
  { header: "Modificado em", getValue: (item) => item.updatedAt ?? "" },
];

export function exportMaterialRequestsUseCase(requests: MaterialRequest[]): void {
  const fileName = `SolicitacoesMaterialCilindrosEDiscos_${toIsoDatePrefix()}.xlsx`;
  exportToExcel(requests, columns, fileName, "Solicitações");
}
