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
import { formatDateTime, formatEmpty, formatNumber, formatStockRecommendationLabel } from "./materialRequestSummaryFormatters";

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
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "14px 16px",
          fontSize: 14,
          fontWeight: 800,
          color: uiTokens.colors.textStrong,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: uiTokens.colors.textMuted }}>▸</span>
        {props.title}
      </summary>
      <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>{props.children}</div>
    </details>
  );
}

function SummarySection(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: `1px solid ${uiTokens.colors.borderStrong}`,
        borderRadius: 16,
        padding: 20,
        display: "grid",
        gap: 14,
        background: uiTokens.colors.surfaceMuted,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: uiTokens.colors.textStrong }}>{props.title}</h3>
        {props.subtitle ? <p style={{ margin: 0, fontSize: 12, color: uiTokens.colors.textMuted }}>{props.subtitle}</p> : null}
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
        <SummarySection title="1. Dados da Solicitação" subtitle="Informações principais da solicitação de material.">
          <SummaryField label="Solicitação" value={requestIdentity} />
          <SummaryField label={materialRequestFieldLabel("requesterName")} value={formatEmpty(request.requesterName)} />
          <SummaryField label={materialRequestFieldLabel("requesterEmail")} value={formatEmpty(request.requesterEmail)} />
          <SummaryField label={materialRequestFieldLabel("createdAt")} value={formatDateTime(request.createdAt)} />
          <SummaryField label={materialRequestFieldLabel("center")} value={formatEmpty(request.center)} />
          <SummaryField label={materialRequestFieldLabel("materialCode")} value={formatEmpty(request.materialCode)} />
          <SummaryField label={materialRequestFieldLabel("materialDescription")} value={formatEmpty(request.materialDescription)} />
          <SummaryField label={materialRequestFieldLabel("requestedQuantity")} value={formatNumber(request.requestedQuantity)} />
          <SummaryField label={materialRequestFieldLabel("evaluatedStockTotalAtRequest")} value={formatNumber(request.evaluatedStockTotalAtRequest)} />
          <SummaryField label={materialRequestFieldLabel("stockRecommendation")} value={formatStockRecommendationLabel(request.stockRecommendation)} />
          <SummaryField label={materialRequestFieldLabel("requestReason")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.requestReason)}</div>} span={2} />
          <SummaryField label={materialRequestFieldLabel("requesterJustification")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.requesterJustification)}</div>} span={2} />
        </SummarySection>

        <CollapsibleSection title="Aprovação Gerente Laminação">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <SummaryField label={materialRequestFieldLabel("laminationManagerName")} value={formatEmpty(request.laminationManagerName)} />
            <SummaryField label={materialRequestFieldLabel("laminationManagerEmail")} value={formatEmpty(request.laminationManagerEmail)} />
            <SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(request.laminationManagerDecisionDate)} />
          </div>
          <SummaryField label={materialRequestFieldLabel("laminationManagerJustification")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.laminationManagerJustification)}</div>} span={2} />
        </CollapsibleSection>

        <CollapsibleSection title="Aprovação CTO">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <SummaryField label={materialRequestFieldLabel("ctoApproverName")} value={formatEmpty(request.ctoApproverName)} />
            <SummaryField label={materialRequestFieldLabel("ctoApproverEmail")} value={formatEmpty(request.ctoApproverEmail)} />
            <SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(request.ctoDecisionDate)} />
          </div>
          <SummaryField label={materialRequestFieldLabel("ctoJustification")} value={<div style={{ whiteSpace: "pre-wrap", minHeight: 72 }}>{formatEmpty(request.ctoJustification)}</div>} span={2} />
        </CollapsibleSection>

        {hasHistory && (
          <CollapsibleSection title="Histórico da Solicitação">
            {historyError ? <StateMessage state="error" message={historyError} /> : null}
            <MaterialRequestHistoryTimeline items={history} loading={loadingHistory} error={null} />
          </CollapsibleSection>
        )}

        {!hasHistory && <StateMessage state="empty" message="Histórico indisponível para solicitação sem ID." />}

        {request.id ? (
          <div style={{ fontSize: 12, color: uiTokens.colors.textMuted }}>
            ID da solicitação no SharePoint: <b>{request.id}</b>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
