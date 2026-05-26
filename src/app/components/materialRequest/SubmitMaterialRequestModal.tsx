import { useState } from "react";
import { submitMaterialRequestForApprovalUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest";
import { useToast } from "../notifications/useToast";
import { AppModal } from "../common/AppModal";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { StateMessage } from "../ui/StateMessage";
import { Button } from "../ui/Button";
import { uiTokens } from "../ui/tokens";

interface SubmitMaterialRequestModalProps {
  request: MaterialRequest;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitMaterialRequestModal(props: SubmitMaterialRequestModalProps) {
  const { notify } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!props.request.id) return setError("Não foi possível identificar a solicitação selecionada.");

    setSubmitting(true);
    try {
      await submitMaterialRequestForApprovalUseCase({
        requestId: props.request.id,
        performedByName: "Usuário atual",
        performedByEmail: "",
      });
      notify("Solicitação enviada para aprovação do Gerente da Laminação.", "success");
      props.onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar a solicitação para aprovação.");
    } finally {
      setSubmitting(false);
    }
  }

  return <AppModal title="Enviar solicitação para aprovação" subtitle="Confirme o envio para análise do Gerente da Laminação." onClose={props.onClose}>
    <div style={{ display: "grid", gap: uiTokens.spacing.md }}>
      <Card>
        <p>Deseja enviar esta solicitação para aprovação do Gerente da Laminação?</p>
      </Card>
      <Card>
        <div style={{ display: "grid", gap: 8 }}>
          <Field label="ID">{props.request.id ?? "-"}</Field>
          <Field label="Centro">{props.request.center || "-"}</Field>
          <Field label="Material">{props.request.materialCode || "-"}</Field>
          <Field label="Descrição">{props.request.materialDescription || "-"}</Field>
          <Field label="Quantidade solicitada">{props.request.requestedQuantity}</Field>
          <Field label="Status atual">{props.request.status}</Field>
        </div>
      </Card>
      {error && <StateMessage state="error" message={error} />}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: uiTokens.spacing.sm }}>
        <Button onClick={props.onClose} disabled={submitting}>Cancelar</Button>
        <Button tone="primary" onClick={() => void handleSubmit()} disabled={submitting}>{submitting ? "Enviando..." : "Enviar p/ Aprovação"}</Button>
      </div>
    </div>
  </AppModal>;
}
