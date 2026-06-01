import { returnMaterialRequestStatusUseCase, getAllowedReturnStatuses } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import type { UserAccessProfile } from "../../../domain/accessControl";
import { useMemo, useState } from "react";
import { AppModal } from "../common/AppModal";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { StateMessage } from "../ui/StateMessage";

export function ReturnMaterialRequestStatusModal({accessProfile,request,onClose,onReturned}:{accessProfile:UserAccessProfile;request:MaterialRequest;onClose:()=>void;onReturned:()=>void}){
const options=useMemo(()=>getAllowedReturnStatuses(request.status),[request.status]);
const [targetStatus,setTargetStatus]=useState(options[0]??""); const [reason,setReason]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
async function submit(){setError("");if(!accessProfile.roles.includes("ADMIN")){setError("Você não possui permissão para voltar o status da solicitação.");return;}setLoading(true);try{await returnMaterialRequestStatusUseCase({requestId:request.id??0,targetStatus:targetStatus,reason,performedByName:"Administrador",accessProfile});onReturned();}catch(e){setError(e instanceof Error?e.message:"Erro ao voltar status.");}finally{setLoading(false);}}
return <AppModal title="Voltar status da solicitação" onClose={onClose}><div style={{padding:16,display:"grid",gap:12}}><Field label="Status atual" layout="inline">{request.status}</Field><Field label="Novo status"><select value={targetStatus} onChange={e=>setTargetStatus(e.target.value as typeof options[number])} style={{width:"100%"}}>{options.map((s)=><option key={s} value={s}>{s}</option>)}</select></Field><Field label="Motivo"><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={4} style={{width:"100%"}}/></Field>{error && <StateMessage state="error" message={error}/>}<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Button onClick={onClose} disabled={loading}>Cancelar</Button><Button tone="primary" onClick={()=>void submit()} disabled={loading || !targetStatus}>{loading?"Salvando...":"Confirmar"}</Button></div></div></AppModal>
}
