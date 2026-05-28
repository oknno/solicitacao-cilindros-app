import type { ReactNode } from "react";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { Field } from "../ui/Field";
import { Badge } from "../ui/Badge";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import {
  formatDateTime,
  formatDecisionLabel,
  formatEmpty,
  formatMaterialRequestStatusLabel,
  formatNumber,
  formatStockRecommendationLabel,
} from "./materialRequestSummaryFormatters";

export function MaterialRequestSummaryPanel({ selected }: { selected: MaterialRequest | null }) {
  return (
    <div style={styles.summaryPanel}>
      <div style={styles.summaryHeader}>
        <div style={styles.summaryTitle}>Resumo</div>
      </div>

      {!selected && <StateMessage state="empty" message="Selecione uma solicitação para visualizar o resumo." />}

      {selected && (
        <div style={styles.summaryContent}>
          <div style={styles.summaryTitleRow}>
            <div style={styles.requestTitle}>{selected.id != null ? `Solicitação #${selected.id}` : formatEmpty(selected.title)}</div>
            <Badge text={formatMaterialRequestStatusLabel(selected.status)} tone={resolveStatusTone(selected.status)} />
          </div>

          <div style={styles.identifierText}>Centro / Material: {`${formatEmpty(selected.center)} - ${formatEmpty(selected.materialCode)}`}</div>

          <div style={styles.fieldGrid}>
            <Field label="Centro" layout="stack">{formatEmpty(selected.center)}</Field>
            <Field label="Material" layout="stack">{formatEmpty(selected.materialCode)}</Field>
            <Field label="Qtde. Solicitada" layout="stack">{formatNumber(selected.requestedQuantity)}</Field>
            <Field label="Estoque Avaliado" layout="stack">{formatNumber(selected.evaluatedStockTotalAtRequest)}</Field>
            <Field label="Parecer" layout="stack">{formatStockRecommendationLabel(selected.stockRecommendation)}</Field>
            <Field label="Solicitante" layout="stack">{formatEmpty(selected.requesterName)}</Field>
          </div>

          <div style={styles.longTextWrap}>
            <LongTextBlock
              title="Dados da solicitação"
              rows={[
                { label: "Descrição do material", value: formatEmpty(selected.materialDescription) },
                { label: "Data da solicitação", value: formatDateTime(selected.createdAt) },
              ]}
            />

            <LongTextBlock
              title="Solicitação"
              rows={[
                { label: "Motivo da solicitação", value: formatEmpty(selected.requestReason) },
                { label: "Justificativa do solicitante", value: formatEmpty(selected.requesterJustification) },
              ]}
            />

            <LongTextBlock
              title="Aprovação Gerente Laminação"
              rows={[
                { label: "Aprovador", value: formatEmpty(selected.laminationManagerName) },
                { label: "Status/decisão", value: formatDecisionLabel(selected.status) },
                { label: "Data da decisão", value: formatDateTime(selected.laminationManagerDecisionDate) },
                { label: "Justificativa", value: formatEmpty(selected.laminationManagerJustification) },
              ]}
            />

            <LongTextBlock
              title="Aprovação CTO"
              rows={[
                { label: "Aprovador", value: formatEmpty(selected.ctoApproverName) },
                { label: "Status/decisão", value: formatDecisionLabel(selected.status) },
                { label: "Data da decisão", value: formatDateTime(selected.ctoDecisionDate) },
                { label: "Justificativa", value: formatEmpty(selected.ctoJustification) },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LongTextBlock(props: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <div>
      <div style={styles.sectionTitle}>{props.title}</div>
      <div style={styles.sectionRows}>
        {props.rows.map((row) => (
          <TextRow key={`${props.title}-${row.label}`} label={row.label}>{row.value}</TextRow>
        ))}
      </div>
    </div>
  );
}

function TextRow(props: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={styles.rowLabel}>{props.label}</div>
      <div style={styles.longText}>{props.children}</div>
    </div>
  );
}

function resolveStatusTone(status?: MaterialRequest["status"]): "neutral" | "info" | "success" | "danger" | "warning" {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "DRAFT" || status === "CANCELLED") return "neutral";
  if (status === "PENDING_LAMINATION_MANAGER_APPROVAL" || status === "PENDING_CTO_APPROVAL") return "warning";
  return "info";
}

const styles = {
  summaryPanel: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%" },
  summaryHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  summaryTitle: { fontWeight: 800, color: uiTokens.colors.textStrong },
  summaryContent: { display: "flex", flexDirection: "column", gap: 12, minWidth: 0, minHeight: 0, height: "100%" },
  summaryTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 },
  requestTitle: { fontWeight: 800, color: uiTokens.colors.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 },
  identifierText: { fontSize: 14, color: uiTokens.colors.text, fontWeight: 600 },
  fieldGrid: { borderTop: `1px solid ${uiTokens.colors.borderMuted}`, paddingTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  longTextWrap: { borderTop: `1px solid ${uiTokens.colors.borderMuted}`, paddingTop: 12, paddingRight: 4, display: "grid", gap: 12, overflowY: "auto", minHeight: 0, flex: 1 },
  sectionRows: { display: "grid", gap: 10 },
  rowLabel: { fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted, marginBottom: 2 },
  longText: { fontSize: 13, lineHeight: 1.5, color: uiTokens.colors.text, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" },
  sectionTitle: { fontWeight: 800, marginBottom: 6 },
} as const;
