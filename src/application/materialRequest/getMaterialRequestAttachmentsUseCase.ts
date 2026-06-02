import { canAccessMaterialRequest, type UserAccessProfile } from "../../domain/accessControl";
import type { MaterialRequestAttachment } from "../../domain/materialRequest/types";
import { getMaterialRequestById, listAttachmentsByRequestId } from "../../services/sharepoint/repositories/materialRequestRepository";
import { resolveCurrentUserAccess } from "../resolveCurrentUserAccess";

export async function getMaterialRequestAttachmentsUseCase(
  requestId: number,
  accessProfile?: UserAccessProfile,
): Promise<MaterialRequestAttachment[]> {
  if (!Number.isInteger(requestId) || requestId <= 0) return [];

  const request = await getMaterialRequestById(requestId);
  if (!request) throw new Error("Solicitação não encontrada.");

  const profile = accessProfile ?? await resolveCurrentUserAccess();
  if (!canAccessMaterialRequest(profile, request)) {
    throw new Error("Você não possui permissão para visualizar esta solicitação.");
  }

  return listAttachmentsByRequestId(requestId);
}
