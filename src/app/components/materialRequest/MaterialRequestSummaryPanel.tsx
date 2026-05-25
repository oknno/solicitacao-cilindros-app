import type { ReactNode } from "react";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { Field } from "../ui/Field";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { StockRecommendationBadge } from "./StockRecommendationBadge";
import { uiTokens } from "../ui/tokens";

function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>{label}</span>
      <span style={{ color: uiTokens.colors.textStrong }}>{value || "-"}</span>
    </div>
  );
}

export function MaterialRequestSummaryPanel({ selected }: { selected: MaterialRequest | null }) {
  const panelStyle = {
    background: uiTokens.colors.surface,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.md,
    overflow: "auto",
    minHeight: 0,
    display: "grid",
    gap: uiTokens.spacing.md,
  } as const;

  if (!selected) {
    return <div style={panelStyle}>
      <div style={{ fontWeight: 800, color: uiTokens.colors.textStrong }}>Resumo</div>
      <p style={{ color: uiTokens.colors.textMuted, margin: 0 }}>Selecione uma solicitação para visualizar o resumo.</p>
    </div>;
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800, color: uiTokens.colors.textStrong }}>Resumo</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 800, color: uiTokens.colors.textStrong, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.title || selected.materialCode || "-"}</div>
          <RequestStatusBadge value={selected.status} />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${uiTokens.colors.borderMuted}`, paddingTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <Field label="Material" layout="stack">{selected.materialCode || "-"}</Field>
        <Field label="Centro" layout="stack">{selected.center || "-"}</Field>
        <Field label="Qtde. Solicitada" layout="stack">{selected.requestedQuantity ?? "-"}</Field>
        <Field label="Estoque Avaliado" layout="stack">{selected.evaluatedStockTotalAtRequest ?? "-"}</Field>
        <Field label="Parecer" layout="stack"><StockRecommendationBadge value={selected.stockRecommendation} /></Field>
        <Field label="Solicitante" layout="stack">{selected.requesterName || "-"}</Field>
      </div>

      <Section title="Solicitação">
        <Row label="Motivo da solicitação" value={selected.requestReason} />
        <Row label="Justificativa do solicitante" value={selected.requesterJustification} />
      </Section>

      <Section title="Aprovação Gerente Laminação">
        <Row label="Nome" value={selected.laminationManagerName} />
        <Row label="Data decisão" value={selected.laminationManagerDecisionDate} />
        <Row label="Justificativa" value={selected.laminationManagerJustification} />
      </Section>

      <Section title="Aprovação CTO">
        <Row label="Nome" value={selected.ctoApproverName} />
        <Row label="Data decisão" value={selected.ctoDecisionDate} />
        <Row label="Justificativa" value={selected.ctoJustification} />
      </Section>
    </div>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return <div style={{ borderTop: `1px solid ${uiTokens.colors.borderMuted}`, paddingTop: 12, display: "grid", gap: 10 }}>
    <div style={{ fontWeight: 800, color: uiTokens.colors.textStrong }}>{props.title}</div>
    <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
  </div>;
}
