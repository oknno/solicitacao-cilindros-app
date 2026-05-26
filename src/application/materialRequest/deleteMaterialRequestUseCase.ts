import { createMaterialRequestHistoryEntry } from "../../services/sharepoint/repositories/materialRequestHistoryRepository";
import { deleteMaterialRequest, getMaterialRequestById } from "../../services/sharepoint/repositories/materialRequestRepository";

export async function deleteMaterialRequestUseCase(input:{requestId:number;performedByName:string;performedByEmail?:string;}):Promise<void>{
 if(!Number.isInteger(input.requestId)||input.requestId<=0) throw new Error("Informe uma solicitação válida.");
 const req=await getMaterialRequestById(input.requestId); if(!req) throw new Error("Solicitação não encontrada.");
 if(req.status!=="DRAFT") throw new Error("Somente solicitações em rascunho podem ser excluídas.");
 await createMaterialRequestHistoryEntry({requestId:input.requestId,action:"DELETED",previousStatus:req.status,newStatus:req.status,performedByName:input.performedByName,performedByEmail:input.performedByEmail,performedAt:new Date().toISOString(),comment:"Solicitação excluída."});
 await deleteMaterialRequest(input.requestId);
}
