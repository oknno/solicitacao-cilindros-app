import { useMemo, useState } from "react";
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

type Decision = Extract<MaterialRequestDecision, "APPROVE" | "REJECT" | "RETURN_FOR_ADJUSTMENT">;

const DECISION_COPY: Record<Decision, { title: string; confirm: string; confirming: string; placeholder: string }> = {
  APPROVE: {
    title: "Aprovar solicitação",
    confirm: "Aprovar",
    confirming: "Aprovando...",
    placeholder: "Informe a justificativa da aprovação.",
  },
  REJECT: {
    title: "Reprovar solicitação",
    confirm: "Reprovar",
    confirming: "Reprovando...",
    placeholder: "Informe o motivo da reprovação.",
  },
  RETURN_FOR_ADJUSTMENT: {
    title: "Devolver para ajuste",
    confirm: "Devolver",
    confirming: "Devolvendo...",
    placeholder: "Informe o motivo da devolução.",
  },
};

const STATUS_LABELS: Record<MaterialRequest["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_LAMINATION_MANAGER_APPROVAL: "Pendente Gerente",
  PENDING_CTO_APPROVAL: "Pendente CTO",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
  RETURNED_FOR_ADJUSTMENT: "Devolvida",
  CANCELLED: "Cancelada",
};

const RECOMMENDATION_LABELS: Record<MaterialRequest["stockRecommendation"], string> = {
  PURCHASE_RECOMMENDED: "Compra recomendada",
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial",
  PURCHASE_NOT_RECOMMENDED: "Compra não recomendada",
  MANUAL_REVIEW_REQUIRED: "Requer análise manual",
};

export function MaterialRequestApprovalModal(props: {
  request: MaterialRequest;
  decision: Decision;
  approverRole: ApproverRole;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { notify } = useToast();
  const [approverName, setApproverName] = useState("Usuário atual");
  const [justification, setJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const copy = useMemo(() => DECISION_COPY[props.decision], [props.decision]);

  async function handleConfirm() {
    setError("");
    if (!props.request.id) return setError("Não foi possível identificar a solicitação selecionada.");
    if (!approverName.trim()) return setError("Informe o nome do aprovador.");
    const normalizedJustification = justification.trim();
    if (!normalizedJustification) return setError("Informe a justificativa para concluir esta decisão.");

    setSending(true);
    try {
      await decideMaterialRequestApprovalUseCase({
        requestId: props.request.id,
        decision: props.decision,
        approverRole: props.approverRole,
        approverName: approverName.trim(),
        justification: normalizedJustification,
      });
      notify(`Solicitação ${copy.confirm.toLowerCase()}a com sucesso.`, "success");
      props.onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar a decisão.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppModal title={copy.title} subtitle="Revise o resumo e informe a justificativa para concluir a decisão." onClose={props.onClose}>
      <div style={{ display: "grid", gap: uiTokens.spacing.md }}>
        <Card>
          <div style={{ display: "grid", gap: 8 }}>
            <Field label="Solicitação">#{props.request.id ?? "-"}</Field>
            <Field label="Centro">{props.request.center || "-"}</Field>
            <Field label="Material">{props.request.materialCode || "-"}</Field>
            <Field label="Descrição">{props.request.materialDescription || "-"}</Field>
            <Field label="Qtde. Solicitada">{props.request.requestedQuantity ?? "-"}</Field>
            <Field label="Estoque Avaliado">{props.request.evaluatedStockTotalAtRequest ?? "-"}</Field>
            <Field label="Parecer">{RECOMMENDATION_LABELS[props.request.stockRecommendation] ?? "-"}</Field>
            <Field label="Solicitante">{props.request.requesterName || "-"}</Field>
            <Field label="Status atual">{STATUS_LABELS[props.request.status] ?? "-"}</Field>
          </div>
        </Card>

        <Card>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Nome do aprovador">
              <input value={approverName} onChange={(e) => setApproverName(e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label="Justificativa">
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={5}
                placeholder={copy.placeholder}
                style={{ width: "100%", resize: "vertical" }}
              />
            </Field>
            {error && <StateMessage state="error" message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: uiTokens.spacing.sm }}>
              <Button onClick={props.onClose} disabled={sending}>Cancelar</Button>
              <Button tone="primary" onClick={() => void handleConfirm()} disabled={sending}>{sending ? copy.confirming : copy.confirm}</Button>
            </div>
          </div>
        </Card>
      </div>
    </AppModal>
  );
}
