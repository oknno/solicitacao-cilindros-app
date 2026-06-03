import { useCallback, useEffect, useState } from "react";
import { addMaterialRequestAttachmentUseCase, deleteMaterialRequestAttachmentUseCase, getMaterialRequestAttachmentsUseCase } from "../../../application/materialRequest";
import type { UserAccessProfile } from "../../../domain/accessControl";
import type { MaterialRequestStatus } from "../../../domain/materialRequest";
import type { MaterialRequestAttachment } from "../../../domain/materialRequest/types";
import { Button } from "../ui/Button";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import { MaterialRequestViewSection } from "./MaterialRequestViewSections";

type RequestAttachmentsMode = "readonly" | "editable";
type RequestAttachmentsSectionProps = { requestId?: number; accessProfile: UserAccessProfile; mode: RequestAttachmentsMode; requestStatus?: MaterialRequestStatus; title?: string; subtitle?: string };

function formatFileSize(size?: number): string | null {
  if (size === undefined || size < 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const actionLinkStyle = { flexShrink: 0, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.mediumWeight } as const;

export function RequestAttachmentsSection({ requestId, accessProfile, mode, requestStatus, title, subtitle }: RequestAttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<MaterialRequestAttachment[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [mutation, setMutation] = useState<"idle" | "adding" | "deleting">("idle");
  const [mutationError, setMutationError] = useState("");
  const canEdit = mode === "editable" && (requestStatus === "DRAFT" || requestStatus === "RETURNED_TO_DRAFT" || requestStatus === "REJECTED");

  const loadAttachments = useCallback(async () => {
    if (!requestId) {
      setAttachments([]);
      setState("loaded");
      return;
    }

    setState("loading");
    try {
      setAttachments(await getMaterialRequestAttachmentsUseCase(requestId, accessProfile));
      setState("loaded");
    } catch {
      setAttachments([]);
      setState("error");
    }
  }, [accessProfile, requestId]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  async function handleAddAttachment(file: File | null) {
    if (!file || !requestId || !canEdit) return;
    setMutation("adding");
    setMutationError("");
    try {
      await addMaterialRequestAttachmentUseCase({ requestId, file, accessProfile });
      await loadAttachments();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Não foi possível adicionar o anexo.");
    } finally {
      setMutation("idle");
    }
  }

  async function handleDeleteAttachment(fileName: string) {
    if (!requestId || !canEdit || !window.confirm(`Deseja excluir o anexo “${fileName}”?`)) return;
    setMutation("deleting");
    setMutationError("");
    try {
      await deleteMaterialRequestAttachmentUseCase({ requestId, fileName, accessProfile });
      await loadAttachments();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Não foi possível excluir o anexo.");
    } finally {
      setMutation("idle");
    }
  }

  const content = (
    <>
      {canEdit ? (
        <label style={{ display: "flex", alignItems: "center", gap: uiTokens.spacing.sm }}>
          <span style={{ fontSize: uiTokens.typography.sm, color: uiTokens.colors.textStrong }}>Adicionar anexo</span>
          <input type="file" disabled={mutation !== "idle"} onChange={(event) => { void handleAddAttachment(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        </label>
      ) : null}

      {mutation === "adding" ? <StateMessage state="loading" message="Adicionando anexo..." /> : null}
      {mutation === "deleting" ? <StateMessage state="loading" message="Excluindo anexo..." /> : null}
      {mutationError ? <StateMessage state="error" message={mutationError} /> : null}
      {state === "loading" ? <StateMessage state="loading" message="Carregando anexos..." /> : null}
      {state === "error" ? <StateMessage state="error" message="Não foi possível carregar os anexos." /> : null}
      {state === "loaded" && attachments.length === 0 ? <StateMessage state="empty" message="Nenhum anexo enviado." /> : null}

      {state === "loaded" && attachments.length > 0 ? (
        <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
          {attachments.map((attachment) => {
            const size = formatFileSize(attachment.size);
            return (
              <div key={attachment.serverRelativeUrl} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: uiTokens.spacing.md, padding: uiTokens.spacing.sm, border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.sm, background: uiTokens.colors.surfaceMuted }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.mediumWeight, overflowWrap: "anywhere" }}>{attachment.fileName}</div>
                  {size ? <div style={{ marginTop: uiTokens.spacing.xxs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{size}</div> : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: uiTokens.spacing.sm, flexShrink: 0 }}>
                  <a href={attachment.url} target="_blank" rel="noreferrer" style={actionLinkStyle}>Abrir</a>
                  <a href={attachment.url} target="_blank" rel="noreferrer" download={attachment.fileName} style={actionLinkStyle}>Baixar</a>
                  {canEdit ? <Button type="button" disabled={mutation !== "idle"} onClick={() => void handleDeleteAttachment(attachment.fileName)} style={{ padding: `${uiTokens.spacing.xs}px ${uiTokens.spacing.sm}px` }}>Excluir</Button> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );

  if (mode === "readonly") {
    return (
      <MaterialRequestViewSection
        title={title ?? "3. Anexos da Solicitação"}
        subtitle={subtitle ?? "Arquivos enviados como apoio à análise da solicitação."}
      >
        {content}
      </MaterialRequestViewSection>
    );
  }

  return (
    <MaterialRequestViewSection
      title={title ?? "5. Anexos da Solicitação"}
      subtitle={subtitle ?? "Inclua arquivos de apoio para análise da solicitação."}
    >
      {content}
    </MaterialRequestViewSection>
  );
}
