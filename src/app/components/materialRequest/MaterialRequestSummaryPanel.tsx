import type { ReactNode } from "react";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { StockRecommendationBadge } from "./StockRecommendationBadge";
import { uiTokens } from "../ui/tokens";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>{label}</span>
      <span style={{ color: uiTokens.colors.textStrong }}>{value ?? "-"}</span>
    </div>
  );
}

export function MaterialRequestSummaryPanel({ selected }: { selected: MaterialRequest | null }) {
  if (!selected) {
    return <p style={{ color: uiTokens.colors.textMuted }}>Selecione uma solicitação para visualizar o resumo.</p>;
  }

  return (
    <div style={{ display: "grid", gap: uiTokens.spacing.md }}>
      <Row label="Solicitação" value={selected.title ?? "-"} />
      <Row label="Material" value={selected.materialCode} />
      <Row label="Descrição" value={selected.materialDescription} />
      <Row label="Centro" value={selected.center} />
      <Row label="Qtde. Solicitada" value={selected.requestedQuantity} />
      <Row label="Estoque Avaliado" value={selected.evaluatedStockTotalAtRequest ?? "-"} />
      <Row label="Parecer" value={<StockRecommendationBadge value={selected.stockRecommendation} />} />
      <Row label="Motivo" value={selected.requestReason} />
      <Row label="Justificativa" value={selected.requesterJustification ?? "-"} />
      <Row label="Status" value={<RequestStatusBadge value={selected.status} />} />
      <Row label="Aprovador CTO" value={selected.ctoApproverName ?? "-"} />
      <Row label="Data decisão CTO" value={selected.ctoDecisionDate ?? "-"} />
      <Row label="Justificativa CTO" value={selected.ctoJustification ?? "-"} />
    </div>
  );
}
