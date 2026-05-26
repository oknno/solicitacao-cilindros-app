import type { MaterialRequest } from "../../../domain/materialRequest/types";

const MATERIAL_REQUEST_FIELD_LABELS: Partial<Record<keyof MaterialRequest | "decisionDate", string>> = {
  id: "ID",
  title: "Título",
  status: "Status",
  requesterName: "Solicitante",
  requesterEmail: "E-mail do Solicitante",
  createdAt: "Data da Solicitação",
  center: "Centro",
  materialCode: "Material",
  materialDescription: "Descrição do Material",
  requestedQuantity: "Qtde. Solicitada",
  evaluatedStockTotalAtRequest: "Estoque Avaliado",
  stockRecommendation: "Parecer",
  requestReason: "Motivo da Solicitação",
  requesterJustification: "Justificativa do Solicitante",
  laminationManagerName: "Aprovador",
  laminationManagerEmail: "E-mail",
  ctoApproverName: "Aprovador",
  ctoApproverEmail: "E-mail",
  decisionDate: "Data da decisão",
  laminationManagerJustification: "Justificativa",
  ctoJustification: "Justificativa",
};

export function materialRequestFieldLabel(field: keyof MaterialRequest | "decisionDate", fallback?: string): string {
  return MATERIAL_REQUEST_FIELD_LABELS[field] ?? fallback ?? field;
}
