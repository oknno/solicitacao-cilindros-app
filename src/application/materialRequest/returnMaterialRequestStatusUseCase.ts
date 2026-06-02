import { assertCanModifyOwnMaterialRequest, type UserAccessProfile } from "../../domain/accessControl";
import type { MaterialRequestStatus } from "../../domain/materialRequest/status";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { getMaterialRequestById, updateMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";

const MAP: Record<MaterialRequestStatus, MaterialRequestStatus[]> = {
  DRAFT: [],
  RETURNED_TO_DRAFT: [],
  PENDING_LAMINATION_MANAGER_APPROVAL: ["RETURNED_TO_DRAFT"],
  PENDING_CTO_APPROVAL: [],
  APPROVED: [],
  REJECTED: [],
};

export const getAllowedReturnStatuses = (status: MaterialRequestStatus) => MAP[status] ?? [];

export async function returnMaterialRequestStatusUseCase(input: {
  requestId: number;
  targetStatus: MaterialRequestStatus;
  reason: string;
  performedByName: string;
  performedByEmail?: string;
  accessProfile: UserAccessProfile;
}) {
  if (!Number.isInteger(input.requestId) || input.requestId <= 0) throw new Error("Informe uma solicitação válida.");
  const request = await getMaterialRequestById(input.requestId);
  if (!request) throw new Error("Solicitação não encontrada.");
  assertCanModifyOwnMaterialRequest(input.accessProfile, request);
  if (request.status === "PENDING_CTO_APPROVAL") {
    throw new Error("Não é possível voltar para rascunho uma solicitação que já foi enviada ao CTO.");
  }
  if (!getAllowedReturnStatuses(request.status).includes(input.targetStatus)) {
    throw new Error("Somente solicitações pendentes do Gerente da Laminação podem voltar para rascunho.");
  }
  const reason = input.reason?.trim();
  if (!reason) throw new Error("Informe o motivo para voltar o status.");
  const updated = await updateMaterialRequest(input.requestId, { status: "RETURNED_TO_DRAFT" });
  await createMaterialRequestHistoryEntry({
    requestId: input.requestId,
    action: "STATUS_RETURNED_TO_DRAFT",
    previousStatus: request.status,
    newStatus: "RETURNED_TO_DRAFT",
    performedByName: input.performedByName,
    performedByEmail: input.performedByEmail,
    performedAt: new Date().toISOString(),
    comment: reason,
  });
  return { request: updated };
}
