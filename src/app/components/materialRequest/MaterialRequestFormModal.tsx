import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { MaterialRequestFormPage } from "../../pages/MaterialRequestFormPage";
import { AppModal } from "../common/AppModal";

export function MaterialRequestFormModal({mode,onClose,onSuccess,request}:{mode:"create"|"edit";onClose:()=>void;onSuccess:()=>void;request?:MaterialRequest|null}){
  return <AppModal title={mode==="edit"?"Editar Solicitação de Material":"Nova Solicitação de Material"} subtitle={mode==="edit"?"Atualize os dados da solicitação selecionada.":"Preencha os dados para salvar a solicitação como rascunho."} onClose={onClose}><MaterialRequestFormPage mode={mode} initialRequest={request??undefined} inModal onBack={onClose} onCreated={onSuccess}/></AppModal>;
}
