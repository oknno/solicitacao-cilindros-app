import type { MaterialRequestStatus } from "../../../domain/materialRequest/status";
import { Badge } from "../ui/Badge";

const statusMap: Record<MaterialRequestStatus, { text: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }> = {
  DRAFT: { text: "Rascunho", tone: "neutral" },
  PENDING_CTO_APPROVAL: { text: "Pendente CTO", tone: "warning" },
  APPROVED_BY_CTO: { text: "Aprovada CTO", tone: "success" },
  REJECTED_BY_CTO: { text: "Reprovada CTO", tone: "danger" },
  RETURNED_FOR_ADJUSTMENT: { text: "Devolvida", tone: "info" },
  CANCELLED: { text: "Cancelada", tone: "neutral" }
};

export function RequestStatusBadge({ value }: { value: MaterialRequestStatus }) {
  const mapped = statusMap[value];
  return <Badge text={mapped.text} tone={mapped.tone} />;
}
