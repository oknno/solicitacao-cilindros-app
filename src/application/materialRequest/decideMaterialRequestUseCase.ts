import type { CtoDecision } from "../../domain/materialRequest";
import { decideMaterialRequestApprovalUseCase } from "./decideMaterialRequestApprovalUseCase";

export interface DecideMaterialRequestInput { requestId:number; decision:CtoDecision; ctoApproverName:string; ctoApproverEmail?:string; ctoJustification?:string; }
export async function decideMaterialRequestUseCase(input:DecideMaterialRequestInput){
  return decideMaterialRequestApprovalUseCase({requestId:input.requestId,decision:input.decision,approverRole:"CTO",approverName:input.ctoApproverName,approverEmail:input.ctoApproverEmail,justification:input.ctoJustification});
}
