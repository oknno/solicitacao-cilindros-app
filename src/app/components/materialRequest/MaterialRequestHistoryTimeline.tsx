import type { MaterialRequestHistoryEntry } from "../../../domain/materialRequest/historyTypes";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import { formatMaterialRequestStatusLabel } from "./materialRequestSummaryFormatters";

interface MaterialRequestHistoryTimelineProps {
  items: MaterialRequestHistoryEntry[];
  loading?: boolean;
  error?: string | null;
}

const ACTION_LABELS: Partial<Record<MaterialRequestHistoryEntry["action"], string>> = {
  CREATED: "Criada",
  UPDATED: "Atualizada",
  SUBMITTED: "Enviada para aprovação",
  CANCELLED: "Cancelada",
  APPROVED_BY_LAMINATION_MANAGER: "Aprovada pelo Gerente da Laminação",
  REJECTED_BY_LAMINATION_MANAGER: "Reprovada pelo Gerente da Laminação",
  RETURNED_BY_LAMINATION_MANAGER: "Devolvida pelo Gerente da Laminação",
  APPROVED_BY_CTO: "Aprovada pelo CTO",
  REJECTED_BY_CTO: "Reprovada pelo CTO",
  RETURNED_BY_CTO: "Devolvida pelo CTO",
  DELETED: "Excluída",
  STATUS_RETURNED: "Status retornado",
  STATUS_RETURNED_TO_DRAFT: "Retornada para rascunho",
};

function getActionLabel(action: MaterialRequestHistoryEntry["action"]): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function MaterialRequestHistoryTimeline({ items, loading, error }: MaterialRequestHistoryTimelineProps) {
  if (loading) {
    return <StateMessage state="loading" message="Carregando histórico da solicitação..." />;
  }

  if (error) {
    return <StateMessage state="error" message={error} />;
  }

  if (!items.length) {
    return <StateMessage state="empty" message="Não há histórico registrado para esta solicitação." />;
  }

  return (
    <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
      {items.map((item, index) => (
        <Card key={`${item.id ?? "history"}-${index}`}>
          <div style={{ display: "grid", gap: 8 }}>
            <Field label="Data e hora" layout="inline">{formatDateTime(item.performedAt)}</Field>
            <Field label="Usuário responsável" layout="inline">{item.performedByName || item.performedByEmail || "-"}</Field>
            <Field label="Ação" layout="inline">{getActionLabel(item.action)}</Field>
            <Field label="Status anterior" layout="inline">{item.previousStatus ? formatMaterialRequestStatusLabel(item.previousStatus) : "-"}</Field>
            <Field label="Novo status" layout="inline">{item.newStatus ? formatMaterialRequestStatusLabel(item.newStatus) : "-"}</Field>
            <Field label="Comentário" layout="inline">{item.comment?.trim() ? item.comment : "-"}</Field>
          </div>
        </Card>
      ))}
    </div>
  );
}
