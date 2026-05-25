import { Badge } from "../../../components/ui/Badge";
import { Field } from "../../../components/ui/Field";
import { StateMessage } from "../../../components/ui/StateMessage";
import { uiTokens } from "../../../components/ui/tokens";
import type { ProjectRow } from "../../../../services/sharepoint/projectsApi";
import { projectFieldLabel } from "../fieldLabels";
import { fmtDate, fmtMoney, getSapCodeDisplay, resolveStatusTone, truncateText } from "../utils/projectSummaryFormatters";

export function ProjectSummarySection(props: {
  selectedId: number | null;
  selectedFull: ProjectRow | null;
  selectedFullState: "idle" | "loading" | "error";
}) {
  return (
    <>
      <div style={styles.summaryHeader}>
        <div style={styles.summaryTitle}>Resumo</div>
      </div>

      {!props.selectedId && <StateMessage state="empty" message="Selecione um projeto para ver o resumo." />}
      {props.selectedId && props.selectedFullState === "loading" && <StateMessage state="loading" message="Carregando detalhes..." />}
      {props.selectedId && props.selectedFullState === "error" && <StateMessage state="error" message="Erro ao carregar detalhes." />}

      {props.selectedFull && (
        <div style={styles.summaryContent}>
          <div style={styles.summaryTitleRow}>
            <div style={styles.projectTitle}>{props.selectedFull.Title}</div>
            <StatusBadge status={String(props.selectedFull.status ?? "Rascunho")} />
          </div>

          <div style={styles.sapCodeText}>
            {projectFieldLabel("codigoSAP")}: {getSapCodeDisplay(props.selectedFull)}
          </div>

          <div style={styles.fieldGrid}>
            <Field label={projectFieldLabel("budgetBrl")} layout="stack">{fmtMoney(props.selectedFull.budgetBrl)}</Field>
            <Field label={projectFieldLabel("projectLeader")} layout="stack">{String(props.selectedFull.projectLeader ?? "-")}</Field>
            <Field label="Início / Fim" layout="stack">{`${fmtDate(props.selectedFull.startDate)}  →  ${fmtDate(props.selectedFull.endDate)}`}</Field>
            <Field label={projectFieldLabel("unit")} layout="stack">{String(props.selectedFull.unit ?? "-")}</Field>
            <Field label={projectFieldLabel("fundingSource")} layout="stack">{String(props.selectedFull.fundingSource ?? "-")}</Field>
            <Field label="Programa" layout="stack">{String(props.selectedFull.program ?? "-")}</Field>
          </div>

          <div style={styles.longTextWrap}>
            <LongTextBlock title={projectFieldLabel("businessNeed")} text={truncateText(props.selectedFull.businessNeed ?? "-", 380)} />
            <LongTextBlock title={projectFieldLabel("proposedSolution")} text={truncateText(props.selectedFull.proposedSolution ?? "-", 380)} />
          </div>

        </div>
      )}
    </>
  );
}

function LongTextBlock(props: { title: string; text: string }) {
  return (
    <div>
      <div style={styles.sectionTitle}>{props.title}</div>
      <div style={styles.longText}>{props.text}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <Badge text={status} tone={resolveStatusTone(status)} />;
}

const styles = {
  summaryHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  summaryTitle: { fontWeight: 800, color: uiTokens.colors.textStrong },
  summaryContent: { display: "grid", gap: 12, minWidth: 0 },
  summaryTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 },
  projectTitle: { fontWeight: 800, color: uiTokens.colors.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 },
  sapCodeText: { fontSize: 14, color: uiTokens.colors.text, fontWeight: 600 },
  fieldGrid: { borderTop: `1px solid ${uiTokens.colors.borderMuted}`, paddingTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  longTextWrap: { borderTop: `1px solid ${uiTokens.colors.borderMuted}`, paddingTop: 12, display: "grid", gap: 12 },
  longText: { fontSize: 13, lineHeight: 1.5, color: uiTokens.colors.text, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" },
  sectionTitle: { fontWeight: 800, marginBottom: 6 },
} as const;
