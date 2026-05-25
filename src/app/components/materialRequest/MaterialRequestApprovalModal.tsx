import { useState } from "react";
import { decideMaterialRequestApprovalUseCase } from "../../../application/materialRequest";
import type { MaterialRequest, MaterialRequestDecision } from "../../../domain/materialRequest";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import { useToast } from "../notifications/useToast";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { AppModal } from "../common/AppModal";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";

type Decision = Extract<MaterialRequestDecision, "APPROVE" | "REJECT">;

export function MaterialRequestApprovalModal(props: {
  request: MaterialRequest;
  initialDecision: Decision;
  approverRole: ApproverRole;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { notify } = useToast();
  const [decision, setDecision] = useState<Decision>(props.initialDecision);
  const [approverName, setApproverName] = useState("Usuário atual");
  const [justification, setJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setError("");
    if (!props.request.id) return setError("Não foi possível identificar a solicitação selecionada.");
    if (!approverName.trim()) return setError("Informe o nome do aprovador.");

    setSending(true);
    try {
      await decideMaterialRequestApprovalUseCase({
        requestId: props.request.id,
        decision,
        approverRole: props.approverRole,
        approverName,
        justification,
      });
      notify(decision === "APPROVE" ? "Solicitação aprovada." : "Solicitação reprovada.", "success");
      props.onDecided();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar a decisão.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppModal title="Decidir solicitação" subtitle="Aprovação da solicitação selecionada." onClose={props.onClose}>
      <div style={{ display: "grid", gap: uiTokens.spacing.md }}>
        <Card>
          <div style={{ display: "grid", gap: 8 }}>
            <Field label="Solicitação">{props.request.title ?? "-"}</Field>
            <Field label="Status atual">{props.request.status}</Field>
            <Field label="Etapa de aprovação">{props.approverRole === "CTO" ? "CTO" : "Gerente da Laminação"}</Field>
          </div>
        </Card>
        <Card>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Decisão">
              <select value={decision} onChange={(e) => setDecision(e.target.value as Decision)} style={{ width: "100%" }}>
                <option value="APPROVE">Aprovar</option>
                <option value="REJECT">Reprovar</option>
              </select>
            </Field>
            <Field label="Nome do aprovador">
              <input value={approverName} onChange={(e) => setApproverName(e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label="Justificativa">
              <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={4} style={{ width: "100%", resize: "vertical" }} />
            </Field>
            {error && <StateMessage state="error" message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: uiTokens.spacing.sm }}>
              <Button onClick={props.onClose} disabled={sending}>Cancelar</Button>
              <Button tone="primary" onClick={() => void handleConfirm()} disabled={sending}>{sending ? "Confirmando..." : "Confirmar"}</Button>
            </div>
          </div>
        </Card>
      </div>
    </AppModal>
  );
}
