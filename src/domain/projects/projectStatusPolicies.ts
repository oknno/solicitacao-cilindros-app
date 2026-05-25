type ProjectWithStatus = {
  status?: string | null;
};

function normalizeStatus(status?: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

export function canEditProject(project: ProjectWithStatus | null): { ok: boolean; reason?: string } {
  if (!project) return { ok: false, reason: "Selecione um projeto." };

  const status = normalizeStatus(project.status);
  if (!status || status === "rascunho" || status === "reprovado") return { ok: true };

  return { ok: false, reason: "Não é possível editar. O projeto não está em rascunho ou reprovado." };
}

export function canDeleteProject(project: ProjectWithStatus | null): { ok: boolean; reason?: string } {
  if (!project) return { ok: false, reason: "Selecione um projeto." };

  const status = normalizeStatus(project.status);
  if (!status || status === "rascunho") return { ok: true };

  return { ok: false, reason: "Somente projetos em rascunho podem ser excluídos." };
}

export function canSendToApproval(project: ProjectWithStatus | null): { ok: boolean; reason?: string } {
  if (!project) return { ok: false, reason: "Selecione um projeto." };

  const status = normalizeStatus(project.status);
  if (status === "rascunho" || status === "reprovado") return { ok: true };

  if (!status) {
    return {
      ok: false,
      reason: "Projeto sem status. Apenas projetos em rascunho podem ser enviados para aprovação."
    };
  }

  if (status === "em aprovação" || status === "em aprovacao") {
    return { ok: false, reason: "Projeto já está em aprovação." };
  }

  if (status === "aprovado") {
    return { ok: false, reason: "Projeto já está aprovado." };
  }

  return { ok: false, reason: `Status atual (“${project.status ?? ""}”) não permite envio automático.` };
}

export function canBackToDraft(project: ProjectWithStatus | null): { ok: boolean; reason?: string } {
  if (!project) return { ok: false, reason: "Selecione um projeto." };

  const status = normalizeStatus(project.status);
  if (!status) return { ok: false, reason: "Status vazio." };
  if (status === "rascunho") return { ok: false, reason: "Projeto já está em rascunho." };
  if (status === "aprovado") return { ok: false, reason: "Projeto aprovado não deve voltar para rascunho." };

  return { ok: true };
}
