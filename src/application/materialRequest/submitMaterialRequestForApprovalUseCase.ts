import type { MaterialRequest } from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { getMaterialRequestById, updateMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";

export interface SubmitMaterialRequestForApprovalInput {
  requestId: number;
  performedByName: string;
  performedByEmail?: string;
}

export interface SubmitMaterialRequestForApprovalOutput {
  request: MaterialRequest;
}

export async function submitMaterialRequestForApprovalUseCase(
  input: SubmitMaterialRequestForApprovalInput,
): Promise<SubmitMaterialRequestForApprovalOutput> {
  if (!Number.isInteger(input.requestId) || input.requestId <= 0) {
    throw new Error("Informe uma solicitação válida.");
  }

  const performedByName = input.performedByName?.trim();
  if (!performedByName) {
    throw new Error("Informe o usuário responsável pelo envio.");
  }

  const request = await getMaterialRequestById(input.requestId);
  if (!request) {
    throw new Error("Solicitação não encontrada.");
  }

  if (request.status !== "DRAFT" && request.status !== "RETURNED_FOR_ADJUSTMENT") {
    throw new Error("A solicitação não pode ser enviada para aprovação neste status.");
  }

  const updatedRequest = await updateMaterialRequest(input.requestId, {
    status: "PENDING_LAMINATION_MANAGER_APPROVAL",
  });

  await createMaterialRequestHistoryEntry({
    requestId: input.requestId,
    action: "SUBMITTED",
    previousStatus: request.status,
    newStatus: "PENDING_LAMINATION_MANAGER_APPROVAL",
    performedByName,
    performedByEmail: input.performedByEmail,
    performedAt: new Date().toISOString(),
    comment: "Solicitação enviada para aprovação do Gerente da Laminação.",
  });

  return { request: updatedRequest };
}
