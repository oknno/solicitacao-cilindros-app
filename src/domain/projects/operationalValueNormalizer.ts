const OPERATIONAL_CATEGORY_CANONICAL_BY_NORMALIZED: Record<string, string> = {
  "AQUISICAO E INSTALACAO INDUSTRIAL": "AQUISICAO E INSTALACAO INDUSTRIAL",
  "MANUTENCAO INDUSTRIAL PESADA": "MANUTENCAO INDUSTRIAL PESADA",
  "OBRAS CIVIS E INFRAESTRUTURA INDUSTRIAL": "OBRAS CIVIS E INFRAESTRUTURA INDUSTRIAL",
  "ADEQUACAO NORMATIVA SEGURANCA E MEIO AMBIENTE": "ADEQUACAO NORMATIVA SEGURANCA E MEIO AMBIENTE",
  "AUTOMACAO SISTEMAS E DIGITALIZACAO INDUSTRIAL": "AUTOMACAO SISTEMAS E DIGITALIZACAO INDUSTRIAL",
  "ENGENHARIA ESTUDOS E VIABILIDADE": "ENGENHARIA ESTUDOS E VIABILIDADE",
  "INFRAESTRUTURA ADMINISTRATIVA TI E FACILITIES": "INFRAESTRUTURA ADMINISTRATIVA TI E FACILITIES"
};

const OPERATIONAL_COMPLEXITY_CANONICAL_BY_NORMALIZED: Record<string, string> = {
  BAIXA: "BAIXA",
  MEDIA: "MEDIA",
  ALTA: "ALTA"
};

function normalizeToken(value?: string): string {
  return String(value ?? "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function normalizeOperationalCategory(value?: string): string | undefined {
  const normalized = normalizeToken(value);
  if (!normalized) return undefined;
  return OPERATIONAL_CATEGORY_CANONICAL_BY_NORMALIZED[normalized] ?? normalized;
}

export function normalizeOperationalComplexity(value?: string): string | undefined {
  const normalized = normalizeToken(value);
  if (!normalized) return undefined;
  return OPERATIONAL_COMPLEXITY_CANONICAL_BY_NORMALIZED[normalized] ?? normalized;
}
