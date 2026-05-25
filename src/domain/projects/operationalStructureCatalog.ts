import { normalizeOperationalCategory, normalizeOperationalComplexity } from "./operationalValueNormalizer";

export const OPERATIONAL_CATEGORIES = [
  "AQUISICAO E INSTALACAO INDUSTRIAL",
  "MANUTENCAO INDUSTRIAL PESADA",
  "OBRAS CIVIS E INFRAESTRUTURA INDUSTRIAL",
  "ADEQUACAO NORMATIVA SEGURANCA E MEIO AMBIENTE",
  "AUTOMACAO SISTEMAS E DIGITALIZACAO INDUSTRIAL",
  "ENGENHARIA ESTUDOS E VIABILIDADE",
  "INFRAESTRUTURA ADMINISTRATIVA TI E FACILITIES"
] as const;

export type OperationalCategory = (typeof OPERATIONAL_CATEGORIES)[number];

export const OPERATIONAL_COMPLEXITIES = ["BAIXA", "MEDIA", "ALTA"] as const;

export type OperationalComplexity = (typeof OPERATIONAL_COMPLEXITIES)[number];

const LEGACY_CATEGORY_BY_CANONICAL: Record<OperationalCategory, string> = {
  "AQUISICAO E INSTALACAO INDUSTRIAL": "aquisicao_e_instalacao_industrial",
  "MANUTENCAO INDUSTRIAL PESADA": "manutencao_industrial_pesada",
  "OBRAS CIVIS E INFRAESTRUTURA INDUSTRIAL": "obras_civis_e_infraestrutura_industrial",
  "ADEQUACAO NORMATIVA SEGURANCA E MEIO AMBIENTE": "adequacao_normativa_seguranca_e_meio_ambiente",
  "AUTOMACAO SISTEMAS E DIGITALIZACAO INDUSTRIAL": "automacao_sistemas_e_digitalizacao_industrial",
  "ENGENHARIA ESTUDOS E VIABILIDADE": "engenharia_estudos_e_viabilidade",
  "INFRAESTRUTURA ADMINISTRATIVA TI E FACILITIES": "infraestrutura_administrativa_ti_e_facilities"
};

const LEGACY_COMPLEXITY_BY_CANONICAL: Record<OperationalComplexity, "baixa" | "media" | "alta"> = {
  BAIXA: "baixa",
  MEDIA: "media",
  ALTA: "alta"
};

const OPERATIONAL_MILESTONES_BY_LEGACY_CATEGORY: Record<string, readonly string[]> = {
  aquisicao_e_instalacao_industrial: ["Definição Técnica", "Aprovação e Liberação", "Aquisição", "Fabricação / Entrega", "Instalação", "Comissionamento e Start-up"],
  manutencao_industrial_pesada: ["Diagnóstico Técnico", "Planejamento da Intervenção", "Contratação e Materiais", "Execução da Intervenção", "Testes e Retorno Operacional", "Encerramento Técnico"],
  obras_civis_e_infraestrutura_industrial: ["Levantamento de Campo", "Engenharia e Projeto", "Contratação", "Execução da Obra", "Inspeção e Qualidade", "Entrega da Obra"],
  adequacao_normativa_seguranca_e_meio_ambiente: ["Diagnóstico de Conformidade", "Solução Técnica", "Aprovação e Contratação", "Implantação", "Validação de Conformidade", "Encerramento e Evidências"],
  automacao_sistemas_e_digitalizacao_industrial: ["Levantamento de Requisitos", "Desenvolvimento / Configuração", "Integração", "Implantação", "Homologação", "Go-live e Estabilização"],
  engenharia_estudos_e_viabilidade: ["Levantamento Inicial", "Desenvolvimento Técnico", "Análise de Viabilidade", "Revisão e Validação", "Aprovação", "Entrega Técnica"],
  infraestrutura_administrativa_ti_e_facilities: ["Definição da Necessidade", "Especificação", "Aquisição / Contratação", "Entrega / Preparação", "Instalação / Configuração", "Liberação para Uso"]
} as const;

const MILESTONE_INDEXES_BY_LEGACY: Record<string, Record<string, readonly number[]>> = {
  aquisicao_e_instalacao_industrial: { alta: [0, 1, 2, 3, 4, 5], media: [0, 2, 4, 5], baixa: [2, 5] },
  manutencao_industrial_pesada: { alta: [0, 1, 2, 3, 4, 5], media: [0, 1, 3, 5], baixa: [0, 5] },
  obras_civis_e_infraestrutura_industrial: { alta: [0, 1, 2, 3, 4, 5], media: [0, 1, 3, 5], baixa: [0, 5] },
  adequacao_normativa_seguranca_e_meio_ambiente: { alta: [0, 1, 2, 3, 4, 5], media: [0, 1, 3, 5], baixa: [0, 5] },
  automacao_sistemas_e_digitalizacao_industrial: { alta: [0, 1, 2, 3, 4, 5], media: [0, 1, 3, 5], baixa: [0, 5] },
  engenharia_estudos_e_viabilidade: { alta: [0, 1, 2, 3, 4, 5], media: [0, 1, 2, 5], baixa: [0, 5] },
  infraestrutura_administrativa_ti_e_facilities: { alta: [0, 1, 2, 3, 4, 5], media: [0, 2, 4, 5], baixa: [2, 5] }
};

export function buildOperationalMilestones(category: OperationalCategory, complexity: OperationalComplexity): string[] {
  const canonicalCategory = normalizeOperationalCategory(category) as OperationalCategory;
  const canonicalComplexity = normalizeOperationalComplexity(complexity) as OperationalComplexity;
  const legacyCategory = LEGACY_CATEGORY_BY_CANONICAL[canonicalCategory];
  const legacyComplexity = LEGACY_COMPLEXITY_BY_CANONICAL[canonicalComplexity];
  const milestones = OPERATIONAL_MILESTONES_BY_LEGACY_CATEGORY[legacyCategory] ?? [];
  const indexes = MILESTONE_INDEXES_BY_LEGACY[legacyCategory]?.[legacyComplexity] ?? [];
  return indexes.map((index) => milestones[index]);
}
