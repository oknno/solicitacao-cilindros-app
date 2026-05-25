import { requiresApproverJustificationOnDecision, type ApproverRole, type MaterialRequest, type MaterialRequestDecision } from "../../domain/materialRequest";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { getMaterialRequestById, updateMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";

export interface DecideMaterialRequestApprovalInput { requestId:number; decision:MaterialRequestDecision; approverRole:ApproverRole; approverName:string; approverEmail?:string; justification?:string; }
export interface DecideMaterialRequestApprovalOutput { request: MaterialRequest; }

export async function decideMaterialRequestApprovalUseCase(input:DecideMaterialRequestApprovalInput):Promise<DecideMaterialRequestApprovalOutput>{
 const request=await getMaterialRequestById(input.requestId); if(!request) throw new Error("Solicitação não encontrada.");
 const justification=input.justification?.trim();
 if(requiresApproverJustificationOnDecision({recommendation:request.stockRecommendation,decision:input.decision}) && !justification) throw new Error("Informe a justificativa para aprovar esta exceção.");
 const nowIso=new Date().toISOString(); let patch:any={updatedAt:nowIso}; let newStatus:any; let action:any; let defaultComment='';
 if(input.approverRole==="LAMINATION_MANAGER"){
  if(request.status!=="PENDING_LAMINATION_MANAGER_APPROVAL") throw new Error("A solicitação não está pendente de aprovação do Gerente da Laminação.");
  const map={APPROVE:"PENDING_CTO_APPROVAL",REJECT:"REJECTED",RETURN_FOR_ADJUSTMENT:"RETURNED_FOR_ADJUSTMENT"} as const;
  const a={APPROVE:"APPROVED_BY_LAMINATION_MANAGER",REJECT:"REJECTED_BY_LAMINATION_MANAGER",RETURN_FOR_ADJUSTMENT:"RETURNED_BY_LAMINATION_MANAGER"} as const;
  const c={APPROVE:"Solicitação aprovada pelo Gerente da Laminação e enviada para aprovação CTO.",REJECT:"Solicitação reprovada pelo Gerente da Laminação.",RETURN_FOR_ADJUSTMENT:"Solicitação devolvida para ajuste pelo Gerente da Laminação."} as const;
  newStatus=map[input.decision]; action=a[input.decision]; defaultComment=c[input.decision];
  patch={...patch,status:newStatus,laminationManagerName:input.approverName,laminationManagerEmail:input.approverEmail,laminationManagerJustification:justification,laminationManagerDecisionDate:nowIso};
 } else {
  if(request.status!=="PENDING_CTO_APPROVAL") throw new Error("A solicitação não está pendente de aprovação CTO.");
  const map={APPROVE:"APPROVED",REJECT:"REJECTED",RETURN_FOR_ADJUSTMENT:"RETURNED_FOR_ADJUSTMENT"} as const;
  const a={APPROVE:"APPROVED_BY_CTO",REJECT:"REJECTED_BY_CTO",RETURN_FOR_ADJUSTMENT:"RETURNED_BY_CTO"} as const;
  const c={APPROVE:"Solicitação aprovada pelo CTO.",REJECT:"Solicitação reprovada pelo CTO.",RETURN_FOR_ADJUSTMENT:"Solicitação devolvida para ajuste pelo CTO."} as const;
  newStatus=map[input.decision]; action=a[input.decision]; defaultComment=c[input.decision];
  patch={...patch,status:newStatus,ctoApproverName:input.approverName,ctoApproverEmail:input.approverEmail,ctoJustification:justification,ctoDecisionDate:nowIso};
 }
 const updated=await updateMaterialRequest(input.requestId,patch);
 await createMaterialRequestHistoryEntry({requestId:input.requestId,action,previousStatus:request.status,newStatus,performedByName:input.approverName,performedByEmail:input.approverEmail,performedAt:new Date().toISOString(),comment:justification||defaultComment});
 return {request:updated};
}
