import {
  analyzeStockForMaterialRequest,
  requiresRequesterJustification,
  normalizeMaterialRequestTechnicalData,
  type MaterialRequest,
  type StockAnalysisResult,
  type StockMaterial,
} from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import {
  addAttachmentsToMaterialRequest,
  createMaterialRequest,
} from "../../services/sharepoint/repositories/materialRequestRepository";
import { findStockMaterialByCenterAndCode } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface CreateMaterialRequestInput {
  requesterName: string;
  requesterEmail?: string;
  center: string;
  materialCode: string;
  requestedQuantity: number;
  requestReason: string;
  requesterJustification?: string;
  materialDescription?: string;
  isManualMaterial?: boolean;
  technicalData?: MaterialRequest["technicalData"];
  attachment?: File;
  attachments?: File[];
}

export interface CreateMaterialRequestOutput {
  request: MaterialRequest;
  stockMaterial: StockMaterial | null;
  stockAnalysis: StockAnalysisResult;
}

export async function createMaterialRequestUseCase(
  input: CreateMaterialRequestInput,
): Promise<CreateMaterialRequestOutput> {
  const requesterName = input.requesterName?.trim();
  if (!requesterName) {
    throw new Error("Informe o nome do solicitante.");
  }

  const materialCode = input.materialCode?.trim();
  if (!materialCode) {
    throw new Error("Informe o código do material.");
  }
  const center = input.center?.trim();
  if (!center) {
    throw new Error("Informe o centro da solicitação.");
  }

  if (input.requestedQuantity <= 0) {
    throw new Error("Informe uma quantidade solicitada maior que zero.");
  }

  const requestReason = input.requestReason?.trim();
  if (!requestReason) {
    throw new Error("Informe o motivo da solicitação.");
  }

  const requesterJustification = input.requesterJustification?.trim();
  const isManualMaterial = Boolean(input.isManualMaterial);
  const manualMaterialDescription = input.materialDescription?.trim();

  if (isManualMaterial && !manualMaterialDescription) {
    throw new Error("Informe a descrição do material.");
  }

  const stockMaterial = isManualMaterial
    ? null
    : await findStockMaterialByCenterAndCode({ center, materialCode });
  const stockAnalysis = analyzeStockForMaterialRequest({
    material: stockMaterial,
    requestedQuantity: input.requestedQuantity,
  });

  if (
    requiresRequesterJustification(stockAnalysis.recommendation) &&
    !requesterJustification
  ) {
    throw new Error(
      "Informe a justificativa para prosseguir com esta solicitação.",
    );
  }

  const nowIso = new Date().toISOString();

  const requestToCreate: MaterialRequest = {
    title: `SMC-${Date.now()}`,
    requesterName,
    requesterEmail: input.requesterEmail,
    materialCode,
    materialDescription: isManualMaterial
      ? manualMaterialDescription ?? ""
      : stockMaterial?.description ?? "",
    center,
    technicalData: normalizeMaterialRequestTechnicalData(input.technicalData),
    requestedQuantity: input.requestedQuantity,
    evaluatedStockTotalAtRequest: stockAnalysis.evaluatedStockTotal,
    stockRecommendation: stockAnalysis.recommendation,
    requestReason,
    requesterJustification,
    status: "DRAFT",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const createdRequest = await createMaterialRequest(requestToCreate);

  if (!createdRequest.id) {
    throw new Error(
      "A solicitação foi criada, mas o ID não foi retornado pelo SharePoint.",
    );
  }

  await createMaterialRequestHistoryEntry({
    requestId: createdRequest.id,
    action: "CREATED",
    previousStatus: undefined,
    newStatus: "DRAFT",
    performedByName: requesterName,
    performedByEmail: input.requesterEmail,
    performedAt: new Date().toISOString(),
    comment: "Solicitação criada como rascunho.",
  });

  const attachments = [...(input.attachments ?? []), ...(input.attachment ? [input.attachment] : [])];
  if (attachments.length) {
    await addAttachmentsToMaterialRequest(createdRequest.id, attachments);
  }

  return {
    request: createdRequest,
    stockMaterial,
    stockAnalysis,
  };
}
