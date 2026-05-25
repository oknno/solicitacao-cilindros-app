import {
  requiresCtoJustificationOnDecision,
  type CtoDecision,
  type MaterialRequest,
  type MaterialRequestHistoryAction,
  type MaterialRequestStatus,
} from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import {
  getMaterialRequestById,
  updateMaterialRequest,
} from "../../services/sharepoint/repositories/materialRequestRepository";

export interface DecideMaterialRequestInput {
  requestId: number;
  decision: CtoDecision;
  ctoApproverName: string;
  ctoApproverEmail?: string;
  ctoJustification?: string;
}

export interface DecideMaterialRequestOutput {
  request: MaterialRequest;
}

const DECISION_TO_STATUS: Record<CtoDecision, MaterialRequestStatus> = {
  APPROVE: "APPROVED_BY_CTO",
  REJECT: "REJECTED_BY_CTO",
  RETURN_FOR_ADJUSTMENT: "RETURNED_FOR_ADJUSTMENT",
};

const DECISION_TO_ACTION: Record<CtoDecision, MaterialRequestHistoryAction> = {
  APPROVE: "APPROVED_BY_CTO",
  REJECT: "REJECTED_BY_CTO",
  RETURN_FOR_ADJUSTMENT: "RETURNED_FOR_ADJUSTMENT",
};

const DECISION_TO_DEFAULT_COMMENT: Record<CtoDecision, string> = {
  APPROVE: "Solicitação aprovada pelo CTO.",
  REJECT: "Solicitação reprovada pelo CTO.",
  RETURN_FOR_ADJUSTMENT: "Solicitação devolvida para ajuste pelo CTO.",
};

export async function decideMaterialRequestUseCase(
  input: DecideMaterialRequestInput,
): Promise<DecideMaterialRequestOutput> {
  if (input.requestId <= 0) {
    throw new Error("Informe uma solicitação válida.");
  }

  const ctoApproverName = input.ctoApproverName?.trim();
  if (!ctoApproverName) {
    throw new Error("Informe o nome do aprovador CTO.");
  }

  const decision = input.decision;
  if (!(decision in DECISION_TO_STATUS)) {
    throw new Error("Informe uma decisão CTO válida.");
  }

  const request = await getMaterialRequestById(input.requestId);
  if (!request) {
    throw new Error("Solicitação não encontrada.");
  }

  if (request.status !== "PENDING_CTO_APPROVAL") {
    throw new Error("A solicitação não está pendente de aprovação CTO.");
  }

  const ctoJustification = input.ctoJustification?.trim();
  const justificationIsRequired = requiresCtoJustificationOnDecision({
    recommendation: request.stockRecommendation,
    decision,
  });

  if (justificationIsRequired && !ctoJustification) {
    throw new Error("Informe a justificativa do CTO para aprovar esta exceção.");
  }

  const newStatus = DECISION_TO_STATUS[decision];
  const nowIso = new Date().toISOString();

  const updatedRequest = await updateMaterialRequest(input.requestId, {
    status: newStatus,
    ctoApproverName,
    ctoApproverEmail: input.ctoApproverEmail,
    ctoJustification,
    ctoDecisionDate: nowIso,
    updatedAt: nowIso,
  });

  await createMaterialRequestHistoryEntry({
    requestId: input.requestId,
    action: DECISION_TO_ACTION[decision],
    previousStatus: request.status,
    newStatus,
    performedByName: ctoApproverName,
    performedByEmail: input.ctoApproverEmail,
    performedAt: new Date().toISOString(),
    comment: ctoJustification || DECISION_TO_DEFAULT_COMMENT[decision],
  });

  return {
    request: updatedRequest,
  };
}
