import { deleteMaterialRequestUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { useState } from "react";
import { AppModal } from "../common/AppModal";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { StateMessage } from "../ui/StateMessage";

export function DeleteMaterialRequestModal({request,onClose,onDeleted}:{request:MaterialRequest;onClose:()=>void;onDeleted:()=>void}){
 const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 async function onConfirm(){setError("");setLoading(true);try{await deleteMaterialRequestUseCase({requestId:request.id??0,performedByName:"Usuário atual"});onDeleted();}catch(e){setError(e instanceof Error?e.message:"Falha ao excluir solicitação.");}finally{setLoading(false);}}
 return <AppModal title="Excluir solicitação" subtitle="Deseja excluir esta solicitação? Esta ação não poderá ser desfeita." onClose={onClose}><div style={{display:"grid",gap:12,padding:16}}><Field label="ID" layout="inline">{request.id ?? "-"}</Field><Field label="Centro" layout="inline">{request.center || "-"}</Field><Field label="Material" layout="inline">{request.materialCode || "-"}</Field><Field label="Descrição" layout="inline">{request.materialDescription || "-"}</Field><Field label="Status" layout="inline">{request.status || "-"}</Field>{error && <StateMessage state="error" message={error}/>}<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Button onClick={onClose} disabled={loading}>Cancelar</Button><Button onClick={()=>void onConfirm()} disabled={loading}>{loading?"Excluindo...":"Excluir"}</Button></div></div></AppModal>
}
