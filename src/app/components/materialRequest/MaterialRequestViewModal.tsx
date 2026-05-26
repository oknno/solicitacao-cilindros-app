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

function CollapsibleSection(props: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details
      open={props.defaultOpen}
      style={{
        border: `1px solid ${uiTokens.colors.border}`,
        borderRadius: 16,
        background: uiTokens.colors.surface,
      }}
    >
      <summary style={{ listStyle: "none", cursor: "pointer", padding: "16px 20px", fontSize: 16, fontWeight: 800, color: uiTokens.colors.textStrong }}>
        {props.title}
      </summary>
      <div style={{ padding: "0 20px 20px", display: "grid", gap: 10 }}>{props.children}</div>
    </details>
  );
}

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
  const requestIdentity = `${formatEmpty(request.center)} - ${formatEmpty(request.materialCode)}`;

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
        <Card>
          <Field label="Solicitação">{requestIdentity}</Field>
        </Card>
        <ReviewSection title="Dados da Solicitação">
          <SummaryField label={materialRequestFieldLabel("requesterName")} value={formatEmpty(request.requesterName)} />
          <SummaryField label={materialRequestFieldLabel("requesterEmail")} value={formatEmpty(request.requesterEmail)} />
          <SummaryField label={materialRequestFieldLabel("createdAt")} value={formatDateTime(request.createdAt)} />
          <SummaryField label={materialRequestFieldLabel("center")} value={formatEmpty(request.center)} />
          <SummaryField label={materialRequestFieldLabel("materialCode")} value={formatEmpty(request.materialCode)} />
          <SummaryField label={materialRequestFieldLabel("materialDescription")} value={formatEmpty(request.materialDescription)} span={2} />
          <SummaryField label={materialRequestFieldLabel("requestedQuantity")} value={formatNumber(request.requestedQuantity)} />
          <SummaryField label={materialRequestFieldLabel("evaluatedStockTotalAtRequest")} value={formatNumber(request.evaluatedStockTotalAtRequest)} />
          <SummaryField label={materialRequestFieldLabel("stockRecommendation")} value={formatStockRecommendationLabel(request.stockRecommendation)} span={2} />
          <SummaryField label={materialRequestFieldLabel("requestReason")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.requestReason)}</div>} span={2} />
          <SummaryField label={materialRequestFieldLabel("requesterJustification")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.requesterJustification)}</div>} span={2} />
        </ReviewSection>

        <CollapsibleSection title="Aprovação Gerente Laminação">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <SummaryField label={materialRequestFieldLabel("laminationManagerName")} value={formatEmpty(request.laminationManagerName)} />
            <SummaryField label={materialRequestFieldLabel("laminationManagerEmail")} value={formatEmpty(request.laminationManagerEmail)} />
            <SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(request.laminationManagerDecisionDate)} />
          </div>
          <SummaryField label={materialRequestFieldLabel("laminationManagerJustification")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.laminationManagerJustification)}</div>} />
        </CollapsibleSection>

        <CollapsibleSection title="Aprovação CTO">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <SummaryField label={materialRequestFieldLabel("ctoApproverName")} value={formatEmpty(request.ctoApproverName)} />
            <SummaryField label={materialRequestFieldLabel("ctoApproverEmail")} value={formatEmpty(request.ctoApproverEmail)} />
            <SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(request.ctoDecisionDate)} />
          </div>
          <SummaryField label={materialRequestFieldLabel("ctoJustification")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.ctoJustification)}</div>} />
        </CollapsibleSection>

        {hasHistory && (
          <CollapsibleSection title="Histórico da Solicitação">
            {historyError ? <StateMessage state="error" message={historyError} /> : null}
            <MaterialRequestHistoryTimeline items={history} loading={loadingHistory} error={null} />
          </CollapsibleSection>
        )}

        {!hasHistory && <StateMessage state="empty" message="Histórico indisponível para solicitação sem ID." />}
        <Card>
          <Field label="ID">{formatEmpty(request.id)}</Field>
        </Card>
        <StateMessage state="empty" message={`Status atual: ${formatMaterialRequestStatusLabel(request.status)} · Parecer: ${formatStockRecommendationLabel(request.stockRecommendation)}.`} />
      </div>
    </AppModal>
  );
}
