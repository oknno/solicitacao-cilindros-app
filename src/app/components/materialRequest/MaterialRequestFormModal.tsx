import { MaterialRequestFormPage } from "../../pages/MaterialRequestFormPage";
import { AppModal } from "../common/AppModal";
export function MaterialRequestFormModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){return <AppModal title="Nova Solicitação de Material" subtitle="Preencha e envie para aprovação do Gerente da Laminação." onClose={onClose}><MaterialRequestFormPage inModal onBack={onClose} onCreated={onCreated}/></AppModal>;}
