import type { MaterialRequestStatus } from "../../../domain/materialRequest/status";
import { Badge } from "../ui/Badge";

const statusMap: Record<MaterialRequestStatus, { text: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }> = {
  DRAFT: { text: "Rascunho", tone: "neutral" },
  PENDING_LAMINATION_MANAGER_APPROVAL: { text: "Pendente Gerente Laminação", tone: "warning" },
  PENDING_CTO_APPROVAL: { text: "Pendente CTO", tone: "warning" },
  APPROVED: { text: "Aprovada", tone: "success" },
  REJECTED: { text: "Reprovada", tone: "danger" },
  RETURNED_FOR_ADJUSTMENT: { text: "Devolvida", tone: "info" },
  CANCELLED: { text: "Cancelada", tone: "neutral" }
};

export function RequestStatusBadge({ value }: { value: MaterialRequestStatus }) {
  const mapped = statusMap[value];

  if (!mapped && import.meta.env.DEV) {
    console.warn("[RequestStatusBadge] Status desconhecido recebido:", value);
  }

  return <Badge text={mapped?.text ?? value ?? "-"} tone={mapped?.tone ?? "neutral"} />;
}
