import type { UserAccessProfile } from "../../domain/accessControl";
import type { MaterialRequestStatus } from "../../domain/materialRequest/status";
import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { getMaterialRequestById, updateMaterialRequest } from "../../services/sharepoint/repositories/materialRequestRepository";

const MAP: Record<MaterialRequestStatus, MaterialRequestStatus[]> = {
  DRAFT: [], PENDING_LAMINATION_MANAGER_APPROVAL: ["DRAFT"], PENDING_CTO_APPROVAL: ["PENDING_LAMINATION_MANAGER_APPROVAL", "DRAFT"], APPROVED: ["PENDING_CTO_APPROVAL"],
  REJECTED: ["PENDING_LAMINATION_MANAGER_APPROVAL", "DRAFT"], RETURNED_FOR_ADJUSTMENT: ["DRAFT"], CANCELLED: []
};
export const getAllowedReturnStatuses = (status: MaterialRequestStatus) => MAP[status] ?? [];

export async function returnMaterialRequestStatusUseCase(input:{requestId:number;targetStatus:MaterialRequestStatus;reason:string;performedByName:string;performedByEmail?:string;accessProfile:UserAccessProfile;}){
 if(!input.accessProfile.roles.includes("ADMIN")) throw new Error("Você não possui permissão para voltar o status da solicitação.");
 if(!Number.isInteger(input.requestId)||input.requestId<=0) throw new Error("Informe uma solicitação válida.");
 const req=await getMaterialRequestById(input.requestId); if(!req) throw new Error("Solicitação não encontrada.");
 const reason=input.reason?.trim(); if(!reason) throw new Error("Informe o motivo para voltar o status.");
 if(!getAllowedReturnStatuses(req.status).includes(input.targetStatus)) throw new Error("Status de destino inválido para o status atual.");
 const updated=await updateMaterialRequest(input.requestId,{status:input.targetStatus});
 await createMaterialRequestHistoryEntry({requestId:input.requestId,action:"STATUS_RETURNED",previousStatus:req.status,newStatus:input.targetStatus,performedByName:input.performedByName,performedByEmail:input.performedByEmail,performedAt:new Date().toISOString(),comment:reason});
 return {request:updated};
}
