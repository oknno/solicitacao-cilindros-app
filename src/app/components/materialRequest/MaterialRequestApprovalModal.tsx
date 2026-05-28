import { useEffect, useMemo, useState } from "react";
import { decideMaterialRequestApprovalUseCase, getMaterialRequestStockAnalysisUseCase } from "../../../application/materialRequest";
import type { MaterialRequest, MaterialRequestDecision, StockMaterial } from "../../../domain/materialRequest";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import { useToast } from "../notifications/useToast";
import { Button } from "../ui/Button";
import { AppModal } from "../common/AppModal";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import { MaterialStockAnalysisSection } from "./MaterialStockAnalysisSection";
import {
  MaterialRequestMainInfoSection,
  MaterialRequestPreviousApprovalSection,
  SummaryField,
  SummarySection,
} from "./MaterialRequestViewSections";
import { formatDateTime, formatMaterialRequestStatusLabel } from "./materialRequestSummaryFormatters";

type Decision = Extract<MaterialRequestDecision, "APPROVE" | "REJECT" | "RETURN_FOR_ADJUSTMENT">;

const JUSTIFICATION_MAX_LENGTH = 2000;

const DECISION_COPY: Record<Decision, { title: string; confirm: string; confirming: string; placeholder: string; successMessage: string }> = {
  APPROVE: {
    title: "Aprovar solicitação",
    confirm: "Aprovar",
    confirming: "Aprovando...",
    placeholder: "Informe a justificativa da aprovação.",
    successMessage: "Solicitação aprovada com sucesso.",
  },
  REJECT: {
    title: "Reprovar solicitação",
    confirm: "Reprovar",
    confirming: "Reprovando...",
    placeholder: "Informe o motivo da reprovação.",
    successMessage: "Solicitação reprovada com sucesso.",
  },
  RETURN_FOR_ADJUSTMENT: {
    title: "Devolver solicitação",
    confirm: "Devolver",
    confirming: "Devolvendo...",
    placeholder: "Informe o motivo da devolução.",
    successMessage: "Solicitação devolvida com sucesso.",
  },
};

const DECISION_SECTION_TITLE: Record<ApproverRole, string> = {
  LAMINATION_MANAGER: "Aprovação Gerente Laminação",
  CTO: "Aprovação CTO",
};

function hasLaminationManagerDecision(request: MaterialRequest): boolean {
  return Boolean(
    request.laminationManagerName
    || request.laminationManagerEmail
    || request.laminationManagerDecisionDate
    || request.laminationManagerJustification,
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
  const [approverEmail, setApproverEmail] = useState("");
  const [justification, setJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [stockMaterial, setStockMaterial] = useState<StockMaterial | null>(null);
  const [stockAnalysisError, setStockAnalysisError] = useState("");
  const [loadingStockAnalysis, setLoadingStockAnalysis] = useState(false);

  const copy = useMemo(() => DECISION_COPY[props.decision], [props.decision]);
  const decisionDate = useMemo(() => new Date().toISOString(), []);
  const showPreviousLaminationApproval = props.approverRole === "CTO" && hasLaminationManagerDecision(props.request);

  useEffect(() => {
    let mounted = true;

    async function loadStockAnalysis() {
      setStockAnalysisError("");
      setLoadingStockAnalysis(true);
      try {
        const result = await getMaterialRequestStockAnalysisUseCase(props.request);
        if (mounted) setStockMaterial(result.stockMaterial);
      } catch (e) {
        if (!mounted) return;
        setStockMaterial(null);
        setStockAnalysisError(e instanceof Error ? e.message : "Não foi possível carregar a análise do material.");
      } finally {
        if (mounted) setLoadingStockAnalysis(false);
      }
    }

    void loadStockAnalysis();
    return () => {
      mounted = false;
    };
  }, [props.request]);

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
        approverEmail: approverEmail.trim() || undefined,
        justification: normalizedJustification,
      });
      notify(copy.successMessage, "success");
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
        <MaterialRequestMainInfoSection request={props.request} />

        {stockAnalysisError ? <StateMessage state="error" message={stockAnalysisError} /> : null}
        {loadingStockAnalysis ? <StateMessage state="loading" message="Carregando análise do material..." /> : <MaterialStockAnalysisSection stockMaterial={stockMaterial} requestedQuantity={props.request.requestedQuantity} mode="approval" />}

        <SummarySection title="Informações Complementares" subtitle="Contexto atual da solicitação para apoiar a decisão.">
          <SummaryField label="Status atual" value={formatMaterialRequestStatusLabel(props.request.status)} span={2} />
        </SummarySection>

        {showPreviousLaminationApproval ? (
          <MaterialRequestPreviousApprovalSection
            title="Aprovação anterior do Gerente da Laminação"
            approverName={props.request.laminationManagerName}
            approverEmail={props.request.laminationManagerEmail}
            decisionDate={props.request.laminationManagerDecisionDate}
            justification={props.request.laminationManagerJustification}
          />
        ) : null}

        <SummarySection title={DECISION_SECTION_TITLE[props.approverRole]} subtitle="Última seção editável: registre os dados da decisão.">
          <SummaryField
            label="Nome do aprovador"
            value={(
              <input
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                disabled={sending}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            )}
          />
          <SummaryField
            label="E-mail"
            value={(
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
                disabled={sending}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            )}
          />
          <SummaryField label="Data da decisão" value={formatDateTime(decisionDate)} />
          <SummaryField label="Decisão" value={copy.confirm} />
          <SummaryField
            label="Justificativa"
            span={2}
            value={(
              <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={7}
                  maxLength={JUSTIFICATION_MAX_LENGTH}
                  placeholder={copy.placeholder}
                  disabled={sending}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                />
                <div style={{ textAlign: "right", fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>
                  {justification.length}/{JUSTIFICATION_MAX_LENGTH} caracteres
                </div>
              </div>
            )}
          />
          {error ? <div style={{ gridColumn: "span 2" }}><StateMessage state="error" message={error} /></div> : null}
        </SummarySection>
      </div>
    </AppModal>
  );
}
