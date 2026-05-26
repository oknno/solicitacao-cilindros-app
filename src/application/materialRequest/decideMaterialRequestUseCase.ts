import type { CtoDecision } from "../../domain/materialRequest";
import { decideMaterialRequestApprovalUseCase } from "./decideMaterialRequestApprovalUseCase";

export interface DecideMaterialRequestInput { requestId:number; decision:CtoDecision; ctoApproverName:string; ctoApproverEmail?:string; ctoJustification?:string; }
export async function decideMaterialRequestUseCase(input:DecideMaterialRequestInput){
  if (!Number.isFinite(input.requestId) || input.requestId <= 0) throw new Error("Informe uma solicitação válida.");
  if (!input.ctoApproverName?.trim()) throw new Error("Informe o nome do aprovador CTO.");
  if (!input.ctoJustification?.trim()) throw new Error("Informe a justificativa para concluir esta decisão.");

  return decideMaterialRequestApprovalUseCase({requestId:input.requestId,decision:input.decision,approverRole:"CTO",approverName:input.ctoApproverName,approverEmail:input.ctoApproverEmail,justification:input.ctoJustification.trim()});
}
