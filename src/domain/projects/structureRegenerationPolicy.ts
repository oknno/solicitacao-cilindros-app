type RegenerationDecisionArgs = {
  hasCompletedMilestone: boolean;
  hasManualConfirmation: boolean;
};

export type StructureRegenerationDecision = {
  allowed: boolean;
  requiresImpactConfirmation: boolean;
  reason?: string;
};

export function decideStructureRegeneration(args: RegenerationDecisionArgs): StructureRegenerationDecision {
  if (args.hasCompletedMilestone) {
    return {
      allowed: false,
      requiresImpactConfirmation: false,
      reason: "Há marco concluído; a regeneração automática está bloqueada e exige ação explícita."
    };
  }

  if (!args.hasManualConfirmation) {
    return {
      allowed: false,
      requiresImpactConfirmation: true,
      reason: "Confirme o impacto da troca de estrutura antes de regenerar."
    };
  }

  return {
    allowed: true,
    requiresImpactConfirmation: false
  };
}

