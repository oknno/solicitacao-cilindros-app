import { assertCanModifyOwnMaterialRequest, type UserAccessProfile } from "../../domain/accessControl";
import { addAttachmentToMaterialRequest, deleteAttachmentFromMaterialRequest, getMaterialRequestById } from "../../services/sharepoint/repositories/materialRequestRepository";
import { resolveCurrentUserAccess } from "../resolveCurrentUserAccess";

interface MaterialRequestAttachmentMutationInput {
  requestId: number;
  accessProfile?: UserAccessProfile;
}

export interface AddMaterialRequestAttachmentInput extends MaterialRequestAttachmentMutationInput {
  file: File;
}

export interface DeleteMaterialRequestAttachmentInput extends MaterialRequestAttachmentMutationInput {
  fileName: string;
}

async function assertCanEditMaterialRequestAttachments(input: MaterialRequestAttachmentMutationInput): Promise<void> {
  if (!Number.isInteger(input.requestId) || input.requestId <= 0) throw new Error("Informe uma solicitação válida.");

  const request = await getMaterialRequestById(input.requestId);
  if (!request) throw new Error("Solicitação não encontrada.");

  assertCanModifyOwnMaterialRequest(input.accessProfile ?? await resolveCurrentUserAccess(), request);
  if (request.status !== "DRAFT" && request.status !== "REJECTED") {
    throw new Error("Os anexos não podem ser alterados neste status.");
  }
}

export async function addMaterialRequestAttachmentUseCase(input: AddMaterialRequestAttachmentInput): Promise<void> {
  if (!input.file) throw new Error("Selecione um arquivo para anexar.");
  await assertCanEditMaterialRequestAttachments(input);
  await addAttachmentToMaterialRequest(input.requestId, input.file);
}

export async function deleteMaterialRequestAttachmentUseCase(input: DeleteMaterialRequestAttachmentInput): Promise<void> {
  const fileName = input.fileName?.trim();
  if (!fileName) throw new Error("Informe o anexo que deseja excluir.");
  await assertCanEditMaterialRequestAttachments(input);
  await deleteAttachmentFromMaterialRequest(input.requestId, fileName);
}
