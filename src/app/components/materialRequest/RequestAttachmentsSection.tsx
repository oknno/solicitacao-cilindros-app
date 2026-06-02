import { useEffect, useState } from "react";
import { getMaterialRequestAttachmentsUseCase } from "../../../application/materialRequest";
import type { UserAccessProfile } from "../../../domain/accessControl";
import type { MaterialRequestAttachment } from "../../../domain/materialRequest/types";
import { Card } from "../ui/Card";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";

function formatFileSize(size?: number): string | null {
  if (size === undefined || size < 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function RequestAttachmentsSection({ requestId, accessProfile }: { requestId?: number; accessProfile: UserAccessProfile }) {
  const [attachments, setAttachments] = useState<MaterialRequestAttachment[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let mounted = true;

    async function loadAttachments() {
      if (!requestId) {
        if (mounted) {
          setAttachments([]);
          setState("loaded");
        }
        return;
      }

      setState("loading");
      try {
        const result = await getMaterialRequestAttachmentsUseCase(requestId, accessProfile);
        if (mounted) {
          setAttachments(result);
          setState("loaded");
        }
      } catch {
        if (mounted) {
          setAttachments([]);
          setState("error");
        }
      }
    }

    void loadAttachments();
    return () => {
      mounted = false;
    };
  }, [accessProfile, requestId]);

  return (
    <Card style={{ display: "grid", gap: uiTokens.spacing.md }}>
      <div>
        <div style={{ fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>Anexos da solicitação</div>
        <div style={{ marginTop: uiTokens.spacing.xxs, fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>Arquivos enviados com esta solicitação.</div>
      </div>

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
                <a href={attachment.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.mediumWeight }}>Abrir</a>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
