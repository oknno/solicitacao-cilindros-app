export type ProjectWithStatus = {
  status?: string | null;
};

export type CommandBarAction =
  | "view"
  | "edit"
  | "duplicate"
  | "delete"
  | "sendToApproval"
  | "backToDraft"
  | "approve"
  | "reject";

type StatusBucket = "missing" | "draft" | "inApproval" | "approved" | "rejected" | "unknown";

export const PROJECT_STATUSES = ["Rascunho", "Em Aprovação", "Aprovado", "Reprovado"] as const;

type ActionRule = {
  enabled: boolean;
  hidden?: boolean;
  reasonWhenDisabled?: string;
};

const statusActionMatrix: Record<StatusBucket, Record<CommandBarAction, ActionRule>> = {
  missing: {
    view: { enabled: true },
    edit: { enabled: true },
    duplicate: { enabled: true },
    delete: { enabled: true },
    sendToApproval: {
      enabled: false,
      reasonWhenDisabled: "Projeto sem status. Apenas projetos em rascunho podem ser enviados para aprovação.",
    },
    backToDraft: { enabled: false, reasonWhenDisabled: "Status vazio." },
    approve: { enabled: false, reasonWhenDisabled: "Somente projetos em aprovação podem ser aprovados." },
    reject: { enabled: false, reasonWhenDisabled: "Somente projetos em aprovação podem ser reprovados." },
  },
  draft: {
    view: { enabled: true },
    edit: { enabled: true },
    duplicate: { enabled: true },
    delete: { enabled: true },
    sendToApproval: { enabled: true },
    backToDraft: { enabled: false, reasonWhenDisabled: "Projeto já está em rascunho." },
    approve: { enabled: false, reasonWhenDisabled: "Somente projetos em aprovação podem ser aprovados." },
    reject: { enabled: false, reasonWhenDisabled: "Somente projetos em aprovação podem ser reprovados." },
  },
  inApproval: {
    view: { enabled: true },
    edit: { enabled: false, reasonWhenDisabled: "Não é possível editar. O projeto não está em rascunho." },
    duplicate: { enabled: true },
    delete: { enabled: false, reasonWhenDisabled: "Somente projetos em rascunho podem ser excluídos." },
    sendToApproval: { enabled: false, reasonWhenDisabled: "Projeto já está em aprovação." },
    backToDraft: { enabled: true },
    approve: { enabled: true },
    reject: { enabled: true },
  },
  approved: {
    view: { enabled: true },
    edit: { enabled: false, reasonWhenDisabled: "Não é possível editar. O projeto não está em rascunho." },
    duplicate: { enabled: true },
    delete: { enabled: false, reasonWhenDisabled: "Somente projetos em rascunho podem ser excluídos." },
    sendToApproval: { enabled: false, reasonWhenDisabled: "Projeto já está aprovado." },
    backToDraft: { enabled: false, reasonWhenDisabled: "Projeto aprovado não deve voltar para rascunho." },
    approve: { enabled: false, reasonWhenDisabled: "Projeto já está aprovado." },
    reject: { enabled: false, reasonWhenDisabled: "Projeto aprovado não pode ser reprovado." },
  },
  rejected: {
    view: { enabled: true },
    edit: { enabled: true },
    duplicate: { enabled: true },
    delete: { enabled: false, reasonWhenDisabled: "Somente projetos em rascunho podem ser excluídos." },
    sendToApproval: { enabled: true },
    backToDraft: { enabled: false, reasonWhenDisabled: "Projeto reprovado não pode voltar status." },
    approve: { enabled: false, reasonWhenDisabled: "Projeto reprovado não pode ser aprovado diretamente." },
    reject: { enabled: false, reasonWhenDisabled: "Projeto já está reprovado." },
  },
  unknown: {
    view: { enabled: true },
    edit: { enabled: false, reasonWhenDisabled: "Status desconhecido. Edição bloqueada por segurança." },
    duplicate: { enabled: true },
    delete: { enabled: false, reasonWhenDisabled: "Status desconhecido. Exclusão bloqueada por segurança." },
    sendToApproval: { enabled: false, reasonWhenDisabled: "Status desconhecido. Envio bloqueado por segurança." },
    backToDraft: { enabled: false, reasonWhenDisabled: "Status desconhecido. Alteração bloqueada por segurança." },
    approve: { enabled: false, reasonWhenDisabled: "Status desconhecido. Aprovação bloqueada por segurança." },
    reject: { enabled: false, reasonWhenDisabled: "Status desconhecido. Reprovação bloqueada por segurança." },
  },
};

export const projectActionMessages = {
  editDenied: "Não foi possível editar o projeto.",
  deleteDenied: "Não foi possível excluir o projeto.",
  sendDenied: "Não foi possível enviar para aprovação.",
  backDenied: "Não foi possível voltar o status para rascunho.",
  approveDenied: "Não foi possível aprovar o projeto.",
  rejectDenied: "Não foi possível reprovar o projeto.",
};

function normalizeStatus(status?: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

function resolveStatusBucket(status?: string | null): StatusBucket {
  const normalized = normalizeStatus(status);
  if (!normalized) return "missing";
  if (normalized === "rascunho") return "draft";
  if (normalized === "em aprovação" || normalized === "em aprovacao") return "inApproval";
  if (normalized === "aprovado") return "approved";
  if (normalized === "reprovado") return "rejected";
  return "unknown";
}

export type ActionPolicy = {
  ok: boolean;
  hidden: boolean;
  reason?: string;
};

function resolveActionPolicy(project: ProjectWithStatus | null, action: CommandBarAction): ActionPolicy {
  if (!project) return { ok: false, hidden: false, reason: "Selecione um projeto." };

  const bucket = resolveStatusBucket(project.status);
  const rule = statusActionMatrix[bucket][action];
  return {
    ok: rule.enabled,
    hidden: Boolean(rule.hidden),
    reason: rule.enabled ? undefined : rule.reasonWhenDisabled,
  };
}

function withFallback(policy: ActionPolicy, fallbackMessage: string): ActionPolicy {
  if (policy.ok) return policy;
  return { ...policy, reason: policy.reason ?? fallbackMessage };
}

export function getCommandBarPolicies(project: ProjectWithStatus | null): Record<CommandBarAction, ActionPolicy> {
  return {
    view: resolveActionPolicy(project, "view"),
    edit: resolveActionPolicy(project, "edit"),
    duplicate: resolveActionPolicy(project, "duplicate"),
    delete: resolveActionPolicy(project, "delete"),
    sendToApproval: resolveActionPolicy(project, "sendToApproval"),
    backToDraft: resolveActionPolicy(project, "backToDraft"),
    approve: resolveActionPolicy(project, "approve"),
    reject: resolveActionPolicy(project, "reject"),
  };
}

export function canEdit(project: ProjectWithStatus | null): ActionPolicy {
  return withFallback(resolveActionPolicy(project, "edit"), projectActionMessages.editDenied);
}

export function canDelete(project: ProjectWithStatus | null): ActionPolicy {
  return withFallback(resolveActionPolicy(project, "delete"), projectActionMessages.deleteDenied);
}

export function canSend(project: ProjectWithStatus | null): ActionPolicy {
  return withFallback(resolveActionPolicy(project, "sendToApproval"), projectActionMessages.sendDenied);
}

export function canBack(project: ProjectWithStatus | null): ActionPolicy {
  return withFallback(resolveActionPolicy(project, "backToDraft"), projectActionMessages.backDenied);
}

export function canApprove(project: ProjectWithStatus | null): ActionPolicy {
  return withFallback(resolveActionPolicy(project, "approve"), projectActionMessages.approveDenied);
}

export function canReject(project: ProjectWithStatus | null): ActionPolicy {
  return withFallback(resolveActionPolicy(project, "reject"), projectActionMessages.rejectDenied);
}
