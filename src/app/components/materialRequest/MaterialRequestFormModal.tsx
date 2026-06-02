import type { UserAccessProfile } from "../../../domain/accessControl";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { MaterialRequestFormPage } from "../../pages/MaterialRequestFormPage";
import { AppModal } from "../common/AppModal";

export function MaterialRequestFormModal({accessProfile,mode,onClose,onSuccess,request}:{accessProfile:UserAccessProfile;mode:"create"|"edit";onClose:()=>void;onSuccess:()=>void;request?:MaterialRequest|null}){
  return <AppModal title={mode === "edit" ? "Editar Solicitação" : "Nova Solicitação"} subtitle={mode === "create" ? "Preencha, revise e salve como rascunho. O envio para aprovação é uma ação separada." : undefined} onClose={onClose}><MaterialRequestFormPage accessProfile={accessProfile} mode={mode} initialRequest={request ?? undefined} inModal onBack={onClose} onCreated={onSuccess} /></AppModal>;
}
