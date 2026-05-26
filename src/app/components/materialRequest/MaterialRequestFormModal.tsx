import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { MaterialRequestFormPage } from "../../pages/MaterialRequestFormPage";
import { AppModal } from "../common/AppModal";

export function MaterialRequestFormModal({mode,onClose,onSuccess,request}:{mode:"create"|"edit";onClose:()=>void;onSuccess:()=>void;request?:MaterialRequest|null}){
  return <AppModal title={mode === "edit" ? "Editar Solicitação" : "Nova Solicitação"} subtitle={mode === "create" ? "Preencha, revise e salve como rascunho. O envio para aprovação é uma ação separada." : undefined} onClose={onClose}><MaterialRequestFormPage mode={mode} initialRequest={request ?? undefined} inModal onBack={onClose} onCreated={onSuccess} /></AppModal>;
}
