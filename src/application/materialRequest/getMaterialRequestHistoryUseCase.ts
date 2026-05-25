import type { MaterialRequestHistoryEntry } from "../../domain/materialRequest/historyTypes";
import { getMaterialRequestHistory } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";

export async function getMaterialRequestHistoryUseCase(
  requestId: number
): Promise<MaterialRequestHistoryEntry[]> {
  if (!Number.isFinite(requestId) || requestId <= 0) {
    throw new Error("Informe uma solicitação válida para consultar o histórico.");
  }

  const history = await getMaterialRequestHistory(requestId);
  return [...history].sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());
}
