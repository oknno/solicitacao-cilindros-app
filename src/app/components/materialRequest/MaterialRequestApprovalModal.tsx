import { useMemo, useState, type ReactNode } from "react";
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
import { materialRequestFieldLabel } from "./materialRequestFieldLabels";
import { formatDateTime, formatEmpty, formatMaterialRequestStatusLabel, formatNumber, formatStockRecommendationLabel } from "./materialRequestSummaryFormatters";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { StockRecommendationBadge } from "./StockRecommendationBadge";

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

function ReviewSection(props: { title: string; children: ReactNode }) {
  const childCount = Array.isArray(props.children) ? props.children.length : 1;
  return (
    <section style={{ border: `1px solid ${uiTokens.colors.border}`, borderRadius: 16, padding: 20, display: "grid", gap: 14, background: uiTokens.colors.surface }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: uiTokens.colors.textStrong }}>{props.title}</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: uiTokens.colors.textMuted, border: `1px solid ${uiTokens.colors.border}`, borderRadius: 999, padding: "4px 10px", background: uiTokens.colors.surface }}>
          {childCount} campo{childCount > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>{props.children}</div>
    </section>
  );
}

function SummaryField(props: { label: string; value: ReactNode; span?: 1 | 2 }) {
  return (
    <Card style={{ padding: "12px 14px", gridColumn: `span ${props.span ?? 1}` }}>
      <Field label={props.label}>{props.value}</Field>
    </Card>
  );
}

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
    <AppModal
      title={copy.title}
      subtitle="Revise o resumo e informe a justificativa para concluir a decisão."
      onClose={props.onClose}
      actions={(
        <>
          <Button onClick={props.onClose} disabled={sending}>Cancelar</Button>
          <Button tone="primary" onClick={() => void handleConfirm()} disabled={sending}>{sending ? copy.confirming : copy.confirm}</Button>
        </>
      )}
    >
      <div style={{ padding: 14, display: "grid", gap: 16 }}>
        <ReviewSection title="Dados da Solicitação">
          <SummaryField label={materialRequestFieldLabel("id")} value={formatEmpty(props.request.id)} />
          <SummaryField label={materialRequestFieldLabel("center")} value={formatEmpty(props.request.center)} />
          <SummaryField label={materialRequestFieldLabel("materialCode")} value={formatEmpty(props.request.materialCode)} />
          <SummaryField label={materialRequestFieldLabel("materialDescription")} value={formatEmpty(props.request.materialDescription)} span={2} />
          <SummaryField label={materialRequestFieldLabel("requestedQuantity")} value={formatNumber(props.request.requestedQuantity)} />
          <SummaryField label={materialRequestFieldLabel("evaluatedStockTotalAtRequest")} value={formatNumber(props.request.evaluatedStockTotalAtRequest)} />
          <SummaryField label={materialRequestFieldLabel("stockRecommendation")} value={<StockRecommendationBadge value={props.request.stockRecommendation} />} />
          <SummaryField label={materialRequestFieldLabel("requesterName")} value={formatEmpty(props.request.requesterName)} />
          <SummaryField label="Status atual" value={<RequestStatusBadge value={props.request.status} />} span={2} />
        </ReviewSection>

        <ReviewSection title="Informações Complementares">
          <SummaryField label={materialRequestFieldLabel("requestReason")} value={formatEmpty(props.request.requestReason)} span={2} />
          <SummaryField label={materialRequestFieldLabel("requesterJustification")} value={formatEmpty(props.request.requesterJustification)} span={2} />
          <SummaryField label={materialRequestFieldLabel("createdAt")} value={formatDateTime(props.request.createdAt)} />
          <SummaryField label="Parecer (texto)" value={formatStockRecommendationLabel(props.request.stockRecommendation)} />
          <SummaryField label="Status (texto)" value={formatMaterialRequestStatusLabel(props.request.status)} span={2} />
        </ReviewSection>

        <ReviewSection title="Decisão">
          <SummaryField label="Nome do aprovador" value={<input value={approverName} onChange={(e) => setApproverName(e.target.value)} style={{ width: "100%" }} />} />
          <SummaryField label="Decisão" value={copy.confirm} />
          <SummaryField
            label="Justificativa"
            span={2}
            value={<textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={5} placeholder={copy.placeholder} style={{ width: "100%", resize: "vertical" }} />}
          />
          {error ? <div style={{ gridColumn: "span 2" }}><StateMessage state="error" message={error} /></div> : null}
        </ReviewSection>
      </div>
    </AppModal>
  );
}
