import { useEffect, useState } from "react";
import { getMaterialRequestHistoryUseCase } from "../../../application/materialRequest";
import type { MaterialRequestHistoryEntry } from "../../../domain/materialRequest/historyTypes";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { AppModal } from "../common/AppModal";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { MaterialRequestHistoryTimeline } from "./MaterialRequestHistoryTimeline";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { StockRecommendationBadge } from "./StockRecommendationBadge";

const M: Partial<Record<MaterialRequest["stockRecommendation"], string>> = {
  PURCHASE_RECOMMENDED: "Compra recomendada.",
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial.",
  PURCHASE_NOT_RECOMMENDED: "Compra não recomendada.",
  MANUAL_REVIEW_REQUIRED: "Requer análise manual.",
};

export function MaterialRequestViewModal({ request, onClose }: { request: MaterialRequest; onClose: () => void }) {
  const recommendationMessage = M[request.stockRecommendation] ?? `Parecer não mapeado: ${request.stockRecommendation ?? "-"}.`;
  const [history, setHistory] = useState<MaterialRequestHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      if (!request.id) {
        if (mounted) {
          setHistory([]);
          setHistoryError("Não foi possível identificar a solicitação para consultar o histórico.");
          setLoadingHistory(false);
        }
        return;
      }

      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const result = await getMaterialRequestHistoryUseCase(request.id);
        if (mounted) setHistory(result);
      } catch (e) {
        if (mounted) setHistoryError(e instanceof Error ? e.message : "Não foi possível carregar o histórico da solicitação.");
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      mounted = false;
    };
  }, [request.id]);

  if (!M[request.stockRecommendation] && import.meta.env.DEV) {
    console.warn("[MaterialRequestViewModal] Parecer sem mensagem mapeada:", request.stockRecommendation);
  }

  return (
    <AppModal
      title={`Visualizar Solicitação #${request.id ?? ""}`}
      subtitle="Modo visualização: campos bloqueados."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 12, padding: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)", fontWeight: 600 }}>Dados da Solicitação</div>
          <Field label="Solicitação / Title" layout="inline">{request.title ?? "-"}</Field>
          <Field label="Solicitante" layout="inline">{request.requesterName}</Field>
          <Field label="Material" layout="inline">{request.materialCode}</Field>
          <Field label="Descrição" layout="inline">{request.materialDescription}</Field>
          <Field label="Centro" layout="inline">{request.center}</Field>
          <Field label="Quantidade solicitada" layout="inline">{request.requestedQuantity}</Field>
          <Field label="Status" layout="inline"><RequestStatusBadge value={request.status} /></Field>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)", fontWeight: 600 }}>Análise de Estoque</div>
          <Field label="Estoque avaliado total" layout="inline">{request.evaluatedStockTotalAtRequest ?? "-"}</Field>
          <Field label="Parecer" layout="inline"><StockRecommendationBadge value={request.stockRecommendation} /></Field>
          <Field label="Mensagem" layout="inline">{recommendationMessage}</Field>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)", fontWeight: 600 }}>Justificativa do Solicitante</div>
          <Field label="Comentário" layout="inline">{request.requesterJustification ?? request.requestReason ?? "-"}</Field>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)", fontWeight: 600 }}>Aprovação Gerente Laminação</div>
          <Field label="Responsável" layout="inline">{request.laminationManagerName ?? "-"}</Field>
          <Field label="Data da decisão" layout="inline">{request.laminationManagerDecisionDate ?? "-"}</Field>
          <Field label="Justificativa" layout="inline">{request.laminationManagerJustification ?? "-"}</Field>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)", fontWeight: 600 }}>Aprovação CTO</div>
          <Field label="Responsável" layout="inline">{request.ctoApproverName ?? "-"}</Field>
          <Field label="Data da decisão" layout="inline">{request.ctoDecisionDate ?? "-"}</Field>
          <Field label="Justificativa" layout="inline">{request.ctoJustification ?? "-"}</Field>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)", fontWeight: 600 }}>Histórico da Solicitação</div>
          <MaterialRequestHistoryTimeline
            items={history}
            loading={loadingHistory}
            error={historyError ?? null}
          />
        </Card>
      </div>
    </AppModal>
  );
}
