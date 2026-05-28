import type { ReactNode } from "react";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { uiTokens } from "../ui/tokens";
import { materialRequestFieldLabel } from "./materialRequestFieldLabels";
import { formatDateTime, formatEmpty, formatNumber, formatStockRecommendationLabel } from "./materialRequestSummaryFormatters";

export function CollapsibleSection(props: { title: string; children: ReactNode; defaultOpen?: boolean }) {
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

export function SummarySection(props: { title: string; subtitle?: string; children: ReactNode }) {
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

export function SummaryField(props: { label: string; value: ReactNode; span?: 1 | 2 }) {
  return (
    <Card style={{ padding: "12px 14px", gridColumn: `span ${props.span ?? 1}` }}>
      <Field label={props.label}>{props.value}</Field>
    </Card>
  );
}

export function LongTextValue({ value, minHeight = 72 }: { value?: string | null; minHeight?: number }) {
  return <div style={{ whiteSpace: "pre-wrap", minHeight }}>{formatEmpty(value)}</div>;
}

export function MaterialRequestMainInfoSection({ request, title = "Dados da Solicitação" }: { request: MaterialRequest; title?: string }) {
  const requestIdentity = `${formatEmpty(request.center)} - ${formatEmpty(request.materialCode)}`;

  return (
    <SummarySection title={title} subtitle="Informações principais da solicitação de material.">
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
      <SummaryField label={materialRequestFieldLabel("requestReason")} value={<LongTextValue value={request.requestReason} />} span={2} />
      {request.requesterJustification ? <SummaryField label={materialRequestFieldLabel("requesterJustification")} value={<LongTextValue value={request.requesterJustification} />} span={2} /> : null}
    </SummarySection>
  );
}

export function MaterialRequestPreviousApprovalSection(props: {
  title: string;
  approverName?: string;
  approverEmail?: string;
  decisionDate?: string;
  justification?: string;
  collapsible?: boolean;
}) {
  const content = (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        <div style={{ minWidth: 0 }}><SummaryField label="Aprovador" value={formatEmpty(props.approverName)} /></div>
        <div style={{ minWidth: 0 }}><SummaryField label="E-mail" value={formatEmpty(props.approverEmail)} /></div>
        <div style={{ minWidth: 0 }}><SummaryField label={materialRequestFieldLabel("decisionDate")} value={formatDateTime(props.decisionDate)} /></div>
      </div>
      <SummaryField label="Justificativa" value={<LongTextValue value={props.justification} />} />
    </>
  );

  if (props.collapsible) return <CollapsibleSection title={props.title}>{content}</CollapsibleSection>;

  return (
    <SummarySection title={props.title} subtitle="Contexto da etapa anterior de aprovação.">
      <div style={{ gridColumn: "span 2", display: "grid", gap: 10 }}>{content}</div>
    </SummarySection>
  );
}
