import assert from "node:assert/strict";
import test from "node:test";

import {
  OPERATIONAL_CATEGORIES,
  OPERATIONAL_COMPLEXITIES,
  OPERATIONAL_MILESTONES_BY_CATEGORY,
  buildOperationalMilestones
} from "../../../src/domain/projects/operationalStructureCatalog.ts";

const EXPECTED_MILESTONES_BY_CATEGORY = {
  aquisicao_e_instalacao_industrial: ["Definição Técnica", "Aprovação e Liberação", "Aquisição", "Fabricação / Entrega", "Instalação", "Comissionamento e Start-up"],
  manutencao_industrial_pesada: ["Diagnóstico Técnico", "Planejamento da Intervenção", "Contratação e Materiais", "Execução da Intervenção", "Testes e Retorno Operacional", "Encerramento Técnico"],
  obras_civis_e_infraestrutura_industrial: ["Levantamento de Campo", "Engenharia e Projeto", "Contratação", "Execução da Obra", "Inspeção e Qualidade", "Entrega da Obra"],
  adequacao_normativa_seguranca_e_meio_ambiente: ["Diagnóstico de Conformidade", "Solução Técnica", "Aprovação e Contratação", "Implantação", "Validação de Conformidade", "Encerramento e Evidências"],
  automacao_sistemas_e_digitalizacao_industrial: ["Levantamento de Requisitos", "Desenvolvimento / Configuração", "Integração", "Implantação", "Homologação", "Go-live e Estabilização"],
  engenharia_estudos_e_viabilidade: ["Levantamento Inicial", "Desenvolvimento Técnico", "Análise de Viabilidade", "Revisão e Validação", "Aprovação", "Entrega Técnica"],
  infraestrutura_administrativa_ti_e_facilities: ["Definição da Necessidade", "Especificação", "Aquisição / Contratação", "Entrega / Preparação", "Instalação / Configuração", "Liberação para Uso"]
};

const EXPECTED_SELECTION_BY_COMPLEXITY = {
  aquisicao_e_instalacao_industrial: {
    alta: ["Definição Técnica", "Aprovação e Liberação", "Aquisição", "Fabricação / Entrega", "Instalação", "Comissionamento e Start-up"],
    media: ["Definição Técnica", "Aquisição", "Instalação", "Comissionamento e Start-up"],
    baixa: ["Aquisição", "Comissionamento e Start-up"]
  },
  manutencao_industrial_pesada: {
    alta: ["Diagnóstico Técnico", "Planejamento da Intervenção", "Contratação e Materiais", "Execução da Intervenção", "Testes e Retorno Operacional", "Encerramento Técnico"],
    media: ["Diagnóstico Técnico", "Planejamento da Intervenção", "Execução da Intervenção", "Encerramento Técnico"],
    baixa: ["Diagnóstico Técnico", "Encerramento Técnico"]
  },
  obras_civis_e_infraestrutura_industrial: {
    alta: ["Levantamento de Campo", "Engenharia e Projeto", "Contratação", "Execução da Obra", "Inspeção e Qualidade", "Entrega da Obra"],
    media: ["Levantamento de Campo", "Engenharia e Projeto", "Execução da Obra", "Entrega da Obra"],
    baixa: ["Levantamento de Campo", "Entrega da Obra"]
  },
  adequacao_normativa_seguranca_e_meio_ambiente: {
    alta: ["Diagnóstico de Conformidade", "Solução Técnica", "Aprovação e Contratação", "Implantação", "Validação de Conformidade", "Encerramento e Evidências"],
    media: ["Diagnóstico de Conformidade", "Solução Técnica", "Implantação", "Encerramento e Evidências"],
    baixa: ["Diagnóstico de Conformidade", "Encerramento e Evidências"]
  },
  automacao_sistemas_e_digitalizacao_industrial: {
    alta: ["Levantamento de Requisitos", "Desenvolvimento / Configuração", "Integração", "Implantação", "Homologação", "Go-live e Estabilização"],
    media: ["Levantamento de Requisitos", "Desenvolvimento / Configuração", "Implantação", "Go-live e Estabilização"],
    baixa: ["Levantamento de Requisitos", "Go-live e Estabilização"]
  },
  engenharia_estudos_e_viabilidade: {
    alta: ["Levantamento Inicial", "Desenvolvimento Técnico", "Análise de Viabilidade", "Revisão e Validação", "Aprovação", "Entrega Técnica"],
    media: ["Levantamento Inicial", "Desenvolvimento Técnico", "Análise de Viabilidade", "Entrega Técnica"],
    baixa: ["Levantamento Inicial", "Entrega Técnica"]
  },
  infraestrutura_administrativa_ti_e_facilities: {
    alta: ["Definição da Necessidade", "Especificação", "Aquisição / Contratação", "Entrega / Preparação", "Instalação / Configuração", "Liberação para Uso"],
    media: ["Definição da Necessidade", "Aquisição / Contratação", "Instalação / Configuração", "Liberação para Uso"],
    baixa: ["Aquisição / Contratação", "Liberação para Uso"]
  }
};

test("catálogo de marcos por categoria mantém os nomes exatos e ordem fixa", () => {
  assert.deepEqual(OPERATIONAL_MILESTONES_BY_CATEGORY, EXPECTED_MILESTONES_BY_CATEGORY);
});

for (const category of OPERATIONAL_CATEGORIES) {
  for (const complexity of OPERATIONAL_COMPLEXITIES) {
    test(`retorna marcos estratégicos para categoria=${category} e complexidade=${complexity}`, () => {
      const result = buildOperationalMilestones(category, complexity);
      assert.deepEqual(result, EXPECTED_SELECTION_BY_COMPLEXITY[category][complexity]);
    });
  }
}
