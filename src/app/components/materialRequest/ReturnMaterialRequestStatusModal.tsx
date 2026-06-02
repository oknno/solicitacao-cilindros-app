import { returnMaterialRequestStatusUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import type { UserAccessProfile } from "../../../domain/accessControl";
import { useState } from "react";
import { AppModal } from "../common/AppModal";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { StateMessage } from "../ui/StateMessage";
import { formatMaterialRequestStatusLabel } from "./materialRequestSummaryFormatters";

export function ReturnMaterialRequestStatusModal({ accessProfile, request, onClose, onReturned }: { accessProfile: UserAccessProfile; request: MaterialRequest; onClose: () => void; onReturned: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setLoading(true);
    try {
      await returnMaterialRequestStatusUseCase({ requestId: request.id ?? 0, targetStatus: "RETURNED_TO_DRAFT", reason, performedByName: accessProfile.userEmail || "Usuário", performedByEmail: accessProfile.userEmail, accessProfile });
      onReturned();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro ao voltar status.");
    } finally {
      setLoading(false);
    }
  }

  return <AppModal title="Voltar status da solicitação" onClose={onClose}><div style={{ padding: 16, display: "grid", gap: 12 }}><Field label="Status atual" layout="inline">{formatMaterialRequestStatusLabel(request.status)}</Field><Field label="Novo status" layout="inline">Retornado para Rascunho</Field><Field label="Motivo"><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} style={{ width: "100%" }} /></Field>{error && <StateMessage state="error" message={error} />}<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button onClick={onClose} disabled={loading}>Cancelar</Button><Button tone="primary" onClick={() => void submit()} disabled={loading}>{loading ? "Salvando..." : "Confirmar"}</Button></div></div></AppModal>;
}
