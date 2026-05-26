import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { MaterialRequestFormPage } from "../../pages/MaterialRequestFormPage";
import { AppModal } from "../common/AppModal";

export function MaterialRequestFormModal({mode,onClose,onSuccess,request}:{mode:"create"|"edit";onClose:()=>void;onSuccess:()=>void;request?:MaterialRequest|null}){
  return <AppModal title={mode === "edit" ? "Editar Solicitação" : "Nova Solicitação"} onClose={onClose}><MaterialRequestFormPage mode={mode} initialRequest={request ?? undefined} inModal onBack={onClose} onCreated={onSuccess} /></AppModal>;
}
