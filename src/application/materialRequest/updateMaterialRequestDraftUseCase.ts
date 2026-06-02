import { assertCanModifyOwnMaterialRequest, type UserAccessProfile } from "../../domain/accessControl";
import { resolveCurrentUserAccess } from "../resolveCurrentUserAccess";
import {
  analyzeStockForMaterialRequest,
  normalizeMaterialRequestTechnicalData,
  requiresRequesterJustification,
  type MaterialRequest,
} from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { findStockMaterialByCenterAndCode } from "../../services/sharepoint/repositories/stockMaterialRepository";
import { getMaterialRequestById, updateMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";

export interface UpdateMaterialRequestDraftInput {
  requestId: number; center: string; materialCode: string; materialDescription?: string; requestedQuantity: number;
  requestReason: string; requesterJustification?: string; technicalData?: MaterialRequest["technicalData"]; isManualMaterial?: boolean; performedByName: string; performedByEmail?: string; accessProfile?: UserAccessProfile;
}

export async function updateMaterialRequestDraftUseCase(input: UpdateMaterialRequestDraftInput): Promise<{ request: MaterialRequest }> {
  if (!Number.isInteger(input.requestId) || input.requestId <= 0) throw new Error("Informe uma solicitação válida.");
  const request = await getMaterialRequestById(input.requestId);
  if (!request) throw new Error("Solicitação não encontrada.");
  assertCanModifyOwnMaterialRequest(input.accessProfile ?? await resolveCurrentUserAccess(), request);
  if (request.status !== "DRAFT" && request.status !== "RETURNED_TO_DRAFT" && request.status !== "REJECTED") throw new Error("Esta solicitação não pode ser editada neste status.");
  const center = input.center?.trim(); const materialCode = input.materialCode?.trim(); const reason = input.requestReason?.trim();
  if (!center) throw new Error("Informe o centro da solicitação.");
  if (!materialCode) throw new Error("Informe o código do material.");
  if (!Number.isFinite(input.requestedQuantity) || input.requestedQuantity <= 0) throw new Error("Informe uma quantidade solicitada maior que zero.");
  if (!reason) throw new Error("Informe o motivo da solicitação.");
  const isManual = Boolean(input.isManualMaterial);
  const manualDescription = input.materialDescription?.trim();
  if (isManual && !manualDescription) throw new Error("Informe a descrição do material.");
  const stockMaterial = isManual ? null : await findStockMaterialByCenterAndCode({ center, materialCode });
  const analysis = analyzeStockForMaterialRequest({ material: stockMaterial, requestedQuantity: input.requestedQuantity });
  const justification = input.requesterJustification?.trim();
  if (requiresRequesterJustification(analysis.recommendation) && !justification) throw new Error("Informe a justificativa para prosseguir com esta solicitação.");
  const updated = await updateMaterialRequest(input.requestId, {
    center, materialCode, materialDescription: isManual ? manualDescription ?? "" : (stockMaterial?.description ?? request.materialDescription),
    requestedQuantity: input.requestedQuantity, evaluatedStockTotalAtRequest: analysis.evaluatedStockTotal, stockRecommendation: analysis.recommendation,
    requestReason: reason, requesterJustification: justification || undefined, technicalData: normalizeMaterialRequestTechnicalData(input.technicalData)
  });
  await createMaterialRequestHistoryEntry({ requestId: input.requestId, action: "UPDATED", previousStatus: request.status, newStatus: request.status, performedByName: input.performedByName, performedByEmail: input.performedByEmail, performedAt: new Date().toISOString(), comment: "Solicitação atualizada." });
  return { request: updated };
}
