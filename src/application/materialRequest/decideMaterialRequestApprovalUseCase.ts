import { type ApproverRole, type MaterialRequest, type MaterialRequestDecision } from "../../domain/materialRequest";
import { assertCanDecideMaterialRequest, type UserAccessProfile } from "../../domain/accessControl";
import { resolveCurrentUserAccess } from "../resolveCurrentUserAccess";
import type { MaterialRequestHistoryAction, MaterialRequestStatus } from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { getMaterialRequestById, updateMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";

export interface DecideMaterialRequestApprovalInput { requestId:number; decision:MaterialRequestDecision; approverRole:ApproverRole; approverName:string; approverEmail?:string; justification:string; accessProfile?:UserAccessProfile; }
export interface DecideMaterialRequestApprovalOutput { request: MaterialRequest; }

export async function decideMaterialRequestApprovalUseCase(input:DecideMaterialRequestApprovalInput):Promise<DecideMaterialRequestApprovalOutput>{
 const request=await getMaterialRequestById(input.requestId); if(!request) throw new Error("Solicitação não encontrada.");
 assertCanDecideMaterialRequest(input.accessProfile ?? await resolveCurrentUserAccess(), request, input.approverRole);
 const justification=input.justification?.trim();
 if(!justification) throw new Error("Informe a justificativa para concluir esta decisão.");
 const nowIso=new Date().toISOString(); let patch:Partial<MaterialRequest>={updatedAt:nowIso}; let newStatus:MaterialRequestStatus; let action:MaterialRequestHistoryAction;
 if(input.approverRole==="LAMINATION_MANAGER"){
  if(request.status!=="PENDING_LAMINATION_MANAGER_APPROVAL") throw new Error("A solicitação não está pendente de aprovação do Gerente da Laminação.");
  const map={APPROVE:"PENDING_CTO_APPROVAL",REJECT:"REJECTED"} as const;
  const a={APPROVE:"APPROVED_BY_LAMINATION_MANAGER",REJECT:"REJECTED_BY_LAMINATION_MANAGER"} as const;
  newStatus=map[input.decision]; action=a[input.decision];
  patch={...patch,status:newStatus,laminationManagerName:input.approverName,laminationManagerEmail:input.approverEmail,laminationManagerJustification:justification,laminationManagerDecisionDate:nowIso};
 } else {
  if(request.status!=="PENDING_CTO_APPROVAL") throw new Error("A solicitação não está pendente de aprovação CTO.");
  const map={APPROVE:"APPROVED",REJECT:"REJECTED"} as const;
  const a={APPROVE:"APPROVED_BY_CTO",REJECT:"REJECTED_BY_CTO"} as const;
  newStatus=map[input.decision]; action=a[input.decision];
  patch={...patch,status:newStatus,ctoApproverName:input.approverName,ctoApproverEmail:input.approverEmail,ctoJustification:justification,ctoDecisionDate:nowIso};
 }
 const updated=await updateMaterialRequest(input.requestId,patch);
 await createMaterialRequestHistoryEntry({requestId:input.requestId,action,previousStatus:request.status,newStatus,performedByName:input.approverName,performedByEmail:input.approverEmail,performedAt:new Date().toISOString(),comment:justification});
 return {request:updated};
}
