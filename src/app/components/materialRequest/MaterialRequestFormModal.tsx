import { MaterialRequestFormPage } from "../../pages/MaterialRequestFormPage";
import { AppModal } from "../common/AppModal";
export function MaterialRequestFormModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){return <AppModal title="Nova Solicitação de Material" subtitle="Preencha os dados para salvar a solicitação como rascunho." onClose={onClose}><MaterialRequestFormPage inModal onBack={onClose} onCreated={onCreated}/></AppModal>;}
