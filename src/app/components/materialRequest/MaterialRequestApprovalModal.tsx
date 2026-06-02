import { useEffect, useMemo, useState } from "react";
import { decideMaterialRequestApprovalUseCase, getCurrentMaterialRequestUserUseCase } from "../../../application/materialRequest";
import type { MaterialRequest, MaterialRequestDecision } from "../../../domain/materialRequest";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import type { UserAccessProfile } from "../../../domain/accessControl";
import { useToast } from "../notifications/useToast";
import { Button } from "../ui/Button";
import { AppModal } from "../common/AppModal";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import { SummaryField, SummarySection } from "./MaterialRequestViewSections";
import { formatDateTime } from "./materialRequestSummaryFormatters";
import { wizardLayoutStyles } from "../../pages/ProjectsPage/components/wizard/wizardLayoutStyles";

type Decision = Extract<MaterialRequestDecision, "APPROVE" | "REJECT">;

const JUSTIFICATION_MAX_LENGTH = 2000;
const GENERIC_CURRENT_USER_NAME = "Usuário atual";

const DECISION_COPY: Record<Decision, { confirm: string; confirming: string; placeholder: string; successMessage: string }> = {
  APPROVE: {
    confirm: "Aprovar",
    confirming: "Aprovando...",
    placeholder: "Informe a justificativa da aprovação.",
    successMessage: "Solicitação aprovada com sucesso.",
  },
  REJECT: {
    confirm: "Reprovar",
    confirming: "Reprovando...",
    placeholder: "Informe a justificativa da reprovação.",
    successMessage: "Solicitação reprovada com sucesso.",
  },
};

const DECISION_SECTION_TITLE: Record<ApproverRole, string> = {
  LAMINATION_MANAGER: "Aprovação Gerente Laminação",
  CTO: "Aprovação CTO",
};

export function MaterialRequestApprovalModal(props: {
  accessProfile: UserAccessProfile;
  request: MaterialRequest;
  decision: Decision;
  approverRole: ApproverRole;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { notify } = useToast();
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [loadingApprover, setLoadingApprover] = useState(true);
  const [justification, setJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const copy = useMemo(() => DECISION_COPY[props.decision], [props.decision]);
  const decisionDate = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let mounted = true;

    setLoadingApprover(true);
    void getCurrentMaterialRequestUserUseCase()
      .then((user) => {
        if (!mounted) return;
        setApproverName(user.name === GENERIC_CURRENT_USER_NAME ? "" : user.name);
        setApproverEmail(user.email);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Não foi possível carregar os dados do aprovador autenticado.");
      })
      .finally(() => {
        if (mounted) setLoadingApprover(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleConfirm() {
    setError("");
    if (!props.request.id) return setError("Não foi possível identificar a solicitação selecionada.");
    if (loadingApprover) return setError("Aguarde o carregamento dos dados do aprovador.");
    if (!approverName.trim()) return setError("Não foi possível carregar o nome do aprovador autenticado.");
    if (!approverEmail.trim()) return setError("Não foi possível carregar o e-mail do aprovador autenticado.");
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
        accessProfile: props.accessProfile,
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
      title={DECISION_SECTION_TITLE[props.approverRole]}
      subtitle="Última seção editável: registre os dados da decisão."
      onClose={props.onClose}
      actions={(
        <>
          <Button onClick={props.onClose} disabled={sending}>Cancelar</Button>
          <Button tone="primary" onClick={() => void handleConfirm()} disabled={sending}>{sending ? copy.confirming : copy.confirm}</Button>
        </>
      )}
    >
      <div style={{ padding: 14, display: "grid", gap: 16 }}>
        <SummarySection title="Dados da decisão">
          <SummaryField
            label="Nome do aprovador"
            value={(
              <input
                value={approverName}
                readOnly
                aria-busy={loadingApprover}
                style={{ ...wizardLayoutStyles.input, boxSizing: "border-box" }}
              />
            )}
          />
          <SummaryField
            label="E-mail"
            value={(
              <input
                type="email"
                value={approverEmail}
                readOnly
                aria-busy={loadingApprover}
                style={{ ...wizardLayoutStyles.input, boxSizing: "border-box" }}
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
                  onChange={(e) => setJustification(e.target.value.slice(0, JUSTIFICATION_MAX_LENGTH))}
                  rows={4}
                  maxLength={JUSTIFICATION_MAX_LENGTH}
                  placeholder={copy.placeholder}
                  disabled={sending}
                  style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable, boxSizing: "border-box", resize: "vertical" }}
                />
                <p style={{ margin: 0, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>
                  {justification.trim().length}/{JUSTIFICATION_MAX_LENGTH} caracteres
                </p>
              </div>
            )}
          />
          {error ? <div style={{ gridColumn: "span 2" }}><StateMessage state="error" message={error} /></div> : null}
        </SummarySection>
      </div>
    </AppModal>
  );
}
