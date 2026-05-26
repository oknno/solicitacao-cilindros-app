import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getMaterialRequestHistoryUseCase } from "../../../application/materialRequest";
import type { MaterialRequestHistoryEntry } from "../../../domain/materialRequest/historyTypes";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { AppModal } from "../common/AppModal";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import { MaterialRequestHistoryTimeline } from "./MaterialRequestHistoryTimeline";
import { materialRequestFieldLabel } from "./materialRequestFieldLabels";
import { formatDateTime, formatEmpty, formatMaterialRequestStatusLabel, formatNumber, formatStockRecommendationLabel } from "./materialRequestSummaryFormatters";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { StockRecommendationBadge } from "./StockRecommendationBadge";

function ReviewSection(props: { title: string; children: ReactNode }) {
  const childCount = Array.isArray(props.children) ? props.children.length : 1;
  return (
    <section
      style={{
        border: `1px solid ${uiTokens.colors.border}`,
        borderRadius: 16,
        padding: 20,
        display: "grid",
        gap: 14,
        background: uiTokens.colors.surface,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: uiTokens.colors.textStrong }}>{props.title}</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: uiTokens.colors.textMuted, border: `1px solid ${uiTokens.colors.border}`, borderRadius: 999, padding: "4px 10px", background: uiTokens.colors.surface }}>
          {childCount} campo{childCount > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>{props.children}</div>
    </section>
  );
}

function SummaryField(props: { label: string; value: ReactNode; span?: 1 | 2 }) {
  return (
    <Card style={{ padding: "12px 14px", gridColumn: `span ${props.span ?? 1}` }}>
      <Field label={props.label}>{props.value}</Field>
    </Card>
  );
}

export function MaterialRequestViewModal({ request, onClose }: { request: MaterialRequest; onClose: () => void }) {
  const [history, setHistory] = useState<MaterialRequestHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const hasHistory = useMemo(() => Boolean(request.id), [request.id]);

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

  return (
    <AppModal title={`Visualizar Solicitação #${request.id ?? ""}`} subtitle="Modo visualização: campos bloqueados." onClose={onClose}>
      <div style={{ padding: 14, display: "grid", gap: 16 }}>
        <ReviewSection title="Dados da Solicitação">
          <SummaryField label={materialRequestFieldLabel("id")} value={formatEmpty(request.id)} />
          <SummaryField label={materialRequestFieldLabel("title")} value={formatEmpty(request.title)} />
          <SummaryField label={materialRequestFieldLabel("status")} value={<RequestStatusBadge value={request.status} />} />
          <SummaryField label={materialRequestFieldLabel("requesterName")} value={formatEmpty(request.requesterName)} />
          <SummaryField label={materialRequestFieldLabel("requesterEmail")} value={formatEmpty(request.requesterEmail)} />
          <SummaryField label={materialRequestFieldLabel("createdAt")} value={formatDateTime(request.createdAt)} />
        </ReviewSection>

        <ReviewSection title="Material">
          <SummaryField label={materialRequestFieldLabel("center")} value={formatEmpty(request.center)} />
          <SummaryField label={materialRequestFieldLabel("materialCode")} value={formatEmpty(request.materialCode)} />
          <SummaryField label={materialRequestFieldLabel("materialDescription")} value={formatEmpty(request.materialDescription)} span={2} />
          <SummaryField label={materialRequestFieldLabel("requestedQuantity")} value={formatNumber(request.requestedQuantity)} />
          <SummaryField label={materialRequestFieldLabel("evaluatedStockTotalAtRequest")} value={formatNumber(request.evaluatedStockTotalAtRequest)} />
          <SummaryField label={materialRequestFieldLabel("stockRecommendation")} value={<StockRecommendationBadge value={request.stockRecommendation} />} span={2} />
        </ReviewSection>

        <ReviewSection title="Justificativas">
          <SummaryField label={materialRequestFieldLabel("requestReason")} value={formatEmpty(request.requestReason)} span={2} />
          <SummaryField label={materialRequestFieldLabel("requesterJustification")} value={formatEmpty(request.requesterJustification)} span={2} />
        </ReviewSection>

        <ReviewSection title="Aprovação Gerente Laminação">
          <SummaryField label={materialRequestFieldLabel("laminationManagerName")} value={formatEmpty(request.laminationManagerName)} />
          <SummaryField label={materialRequestFieldLabel("laminationManagerEmail")} value={formatEmpty(request.laminationManagerEmail)} />
          <SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(request.laminationManagerDecisionDate)} />
          <SummaryField label={materialRequestFieldLabel("laminationManagerJustification")} value={formatEmpty(request.laminationManagerJustification)} span={2} />
        </ReviewSection>

        <ReviewSection title="Aprovação CTO">
          <SummaryField label={materialRequestFieldLabel("ctoApproverName")} value={formatEmpty(request.ctoApproverName)} />
          <SummaryField label={materialRequestFieldLabel("ctoApproverEmail")} value={formatEmpty(request.ctoApproverEmail)} />
          <SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(request.ctoDecisionDate)} />
          <SummaryField label={materialRequestFieldLabel("ctoJustification")} value={formatEmpty(request.ctoJustification)} span={2} />
        </ReviewSection>

        {hasHistory && (
          <ReviewSection title="Histórico da Solicitação">
            <div style={{ gridColumn: "span 2" }}>
              {historyError ? <StateMessage state="error" message={historyError} /> : null}
              <MaterialRequestHistoryTimeline items={history} loading={loadingHistory} error={null} />
            </div>
          </ReviewSection>
        )}

        {!hasHistory && <StateMessage state="empty" message="Histórico indisponível para solicitação sem ID." />}
        <StateMessage state="empty" message={`Status atual: ${formatMaterialRequestStatusLabel(request.status)} · Parecer: ${formatStockRecommendationLabel(request.stockRecommendation)}.`} />
      </div>
    </AppModal>
  );
}
