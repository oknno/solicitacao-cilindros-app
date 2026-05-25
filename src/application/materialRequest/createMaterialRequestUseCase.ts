import {
  analyzeStockForMaterialRequest,
  requiresRequesterJustification,
  type MaterialRequest,
  type StockAnalysisResult,
  type StockMaterial,
} from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { createMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";
import { findStockMaterialByCode } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface CreateMaterialRequestInput {
  requesterName: string;
  requesterEmail?: string;
  materialCode: string;
  requestedQuantity: number;
  requestReason: string;
  requesterJustification?: string;
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

  if (input.requestedQuantity <= 0) {
    throw new Error("Informe uma quantidade solicitada maior que zero.");
  }

  const requestReason = input.requestReason?.trim();
  if (!requestReason) {
    throw new Error("Informe o motivo da solicitação.");
  }

  const requesterJustification = input.requesterJustification?.trim();

  const stockMaterial = await findStockMaterialByCode(materialCode);
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
    materialDescription: stockMaterial?.description ?? "",
    center: stockMaterial?.center ?? "",
    requestedQuantity: input.requestedQuantity,
    evaluatedStockTotalAtRequest: stockAnalysis.evaluatedStockTotal,
    stockRecommendation: stockAnalysis.recommendation,
    requestReason,
    requesterJustification,
    status: "PENDING_CTO_APPROVAL",
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
    newStatus: "PENDING_CTO_APPROVAL",
    performedByName: requesterName,
    performedByEmail: input.requesterEmail,
    performedAt: new Date().toISOString(),
    comment: "Solicitação criada e enviada para aprovação CTO.",
  });

  return {
    request: createdRequest,
    stockMaterial,
    stockAnalysis,
  };
}
