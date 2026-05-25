import type { ProjectDraft } from "../../../services/sharepoint/projectsApi";

const PROJECT_FIELD_LABELS: Partial<Record<keyof ProjectDraft | "Id", string>> = {
  Id: "ID",
  Title: "Nome do Projeto",
  approvalYear: "Ano de Aprovação",
  budgetBrl: "Orçamento (BRL)",
  status: "Status",
  investmentLevel: "Nível de Investimento",
  fundingSource: "Fonte de Recursos",
  program: "Programa",
  company: "Empresa",
  center: "Centro",
  unit: "Unidade",
  location: "Local de Implantação",
  depreciationCostCenter: "Centro de Custo (Depreciação)",
  category: "Categoria",
  investmentType: "Tipo de Investimento",
  assetType: "Tipo de Ativo",
  projectFunction: "Função do Projeto",
  projectLeader: "Líder do Projeto",
  projectUser: "Usuário do Projeto",
  codigoSAP: "Código SAP",
  sourceProjectCode: "Código do Projeto de Origem",
  hasRoce: "Possui ROCE",
  startDate: "Data de Início",
  endDate: "Data de Término",
  businessNeed: "Necessidade do Negócio",
  proposedSolution: "Solução Proposta",
  kpiType: "Tipo de KPI",
  kpiName: "Nome do KPI",
  kpiDescription: "Descrição do KPI",
  kpiCurrent: "KPI Atual",
  kpiExpected: "KPI Esperado",
  roceGain: "Ganho ROCE (BRL)",
  roceGainDescription: "Descrição do Ganho ROCE",
  roceLoss: "Perda ROCE (BRL)",
  roceLossDescription: "Descrição da Perda ROCE",
  roceClassification: "Classificação ROCE",
  operationalCategory: "Categoria Operacional",
  complexity: "Complexidade"
};

export function projectFieldLabel(field: keyof ProjectDraft | "Id", fallback?: string): string {
  return PROJECT_FIELD_LABELS[field] ?? fallback ?? field;
}
