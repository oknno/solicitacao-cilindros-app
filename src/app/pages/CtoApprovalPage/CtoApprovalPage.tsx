import { useState } from "react";
import { decideMaterialRequestUseCase } from "../../../application/materialRequest";
import type { CtoDecision, MaterialRequest } from "../../../domain/materialRequest";
import { RequestStatusBadge } from "../../components/materialRequest/RequestStatusBadge";
import { StockRecommendationBadge } from "../../components/materialRequest/StockRecommendationBadge";
import { useToast } from "../../components/notifications/useToast";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";

interface CtoApprovalPageProps {
  request: MaterialRequest;
  initialDecision?: CtoDecision;
  onBack: () => void;
  onDecided: () => void;
}

const ctoApproverNameFallback = "Usuário atual";
const ctoApproverEmailFallback = "";

const RECOMMENDATION_MESSAGES: Record<MaterialRequest["stockRecommendation"], string> = {
  PURCHASE_RECOMMENDED: "Compra recomendada. Não há estoque avaliado disponível para este material.",
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial. O estoque atual não atende integralmente à quantidade solicitada.",
  PURCHASE_NOT_RECOMMENDED: "Compra não recomendada. Existe estoque avaliado suficiente para atender à quantidade solicitada.",
  MANUAL_REVIEW_REQUIRED: "A solicitação requer análise manual.",
};

const DECISION_LABELS: Record<CtoDecision, string> = {
  APPROVE: "Aprovar",
  REJECT: "Reprovar",
  RETURN_FOR_ADJUSTMENT: "Devolver para ajuste",
};

const DECISION_SUCCESS_MESSAGES: Record<CtoDecision, string> = {
  APPROVE: "Solicitação aprovada pelo CTO.",
  REJECT: "Solicitação reprovada pelo CTO.",
  RETURN_FOR_ADJUSTMENT: "Solicitação devolvida para ajuste.",
};

export function CtoApprovalPage({ request, initialDecision, onBack, onDecided }: CtoApprovalPageProps) {
  const { notify } = useToast();
  const [decision, setDecision] = useState<CtoDecision | "">(initialDecision ?? "");
  const [ctoApproverName, setCtoApproverName] = useState(ctoApproverNameFallback);
  const [ctoApproverEmail, setCtoApproverEmail] = useState(ctoApproverEmailFallback);
  const [ctoJustification, setCtoJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const stockRecommendationMessage = RECOMMENDATION_MESSAGES[request.stockRecommendation];

  async function handleConfirmDecision() {
    setError("");
    if (!request.id) return setError("Não foi possível identificar a solicitação selecionada.");
    if (!decision) return setError("Selecione uma decisão do CTO.");
    if (!ctoApproverName.trim()) return setError("Informe o nome do aprovador CTO.");

    setSending(true);
    try {
      await decideMaterialRequestUseCase({ requestId: request.id, decision, ctoApproverName, ctoApproverEmail, ctoJustification });
      notify(DECISION_SUCCESS_MESSAGES[decision], "success");
      onDecided();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Não foi possível registrar a decisão CTO.");
    } finally {
      setSending(false);
    }
  }

  return <div style={{ background: uiTokens.colors.appBackground, minHeight: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto 1fr", gap: uiTokens.spacing.md }}>
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: uiTokens.spacing.md, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Aprovação CTO</h2>
        <RequestStatusBadge value={request.status} />
      </div>
    </Card>

    <div style={{ display: "grid", gap: uiTokens.spacing.md, alignContent: "start" }}>
      <Card>
        <h3 style={{ margin: "0 0 12px" }}>Dados da solicitação</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Solicitação / Title" layout="inline">{request.title ?? "-"}</Field>
          <Field label="Solicitante" layout="inline">{request.requesterName}</Field>
          <Field label="Material" layout="inline">{request.materialCode}</Field>
          <Field label="Descrição" layout="inline">{request.materialDescription}</Field>
          <Field label="Centro" layout="inline">{request.center}</Field>
          <Field label="Quantidade solicitada" layout="inline">{request.requestedQuantity}</Field>
          <Field label="Estoque avaliado total" layout="inline">{request.evaluatedStockTotalAtRequest ?? "-"}</Field>
          <Field label="Status atual" layout="inline"><RequestStatusBadge value={request.status} /></Field>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 12px" }}>Análise automática</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Parecer" layout="inline"><StockRecommendationBadge value={request.stockRecommendation} /></Field>
          <Field label="Mensagem" layout="inline">{stockRecommendationMessage}</Field>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 12px" }}>Justificativas</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Motivo da solicitação" layout="inline">{request.requestReason}</Field>
          <Field label="Justificativa do solicitante" layout="inline">{request.requesterJustification?.trim() || "-"}</Field>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 12px" }}>Decisão CTO</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Decisão">
            <select value={decision} onChange={(e) => setDecision(e.target.value as CtoDecision | "")} style={{ width: "100%" }}>
              <option value="">Selecione...</option>
              {Object.entries(DECISION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Nome do aprovador CTO"><input value={ctoApproverName} onChange={(e) => setCtoApproverName(e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label="E-mail do aprovador CTO"><input value={ctoApproverEmail} onChange={(e) => setCtoApproverEmail(e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label="Justificativa CTO"><textarea value={ctoJustification} onChange={(e) => setCtoJustification(e.target.value)} rows={5} style={{ width: "100%", resize: "vertical" }} placeholder="Preencha quando necessário conforme política de exceção." /></Field>
          {error && <StateMessage state="error" message={error} />}
          <div style={{ display: "flex", gap: uiTokens.spacing.sm, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button onClick={onBack} disabled={sending}>Voltar</Button>
            <Button tone="primary" onClick={() => void handleConfirmDecision()} disabled={sending}>{sending ? "Confirmando..." : "Confirmar decisão"}</Button>
          </div>
        </div>
      </Card>
    </div>
  </div>;
}
