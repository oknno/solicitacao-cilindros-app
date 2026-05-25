export type SelectOption = { value: string; label: string; description?: string };

import { COMPANY_CENTER_UNIT_LOCATION_MAP } from "./companyStructure";

export const EXCHANGE_RATE = 5.4;

export const FUNDING_SOURCE_OPTIONS: SelectOption[] = [
  { value: "BUDGET", label: "BUDGET" },
  { value: "EXTRA", label: "EXTRA" },
  { value: "REMANEJAMENTO", label: "REMANEJAMENTO" },
  { value: "CARRY OVER", label: "CARRY OVER" }
];

export const PROGRAM_OPTIONS: SelectOption[] = [
  { value: "ACELERAAI", label: "ACELERA.AI" },
  { value: "REGULAR", label: "REGULAR" }
];

export const COMPANY_OPTIONS: SelectOption[] = [
  ...Object.keys(COMPANY_CENTER_UNIT_LOCATION_MAP).map((company) => ({ value: company, label: company }))
];

export const CENTER_OPTIONS_BY_COMPANY: Record<string, SelectOption[]> = {
  ...Object.fromEntries(
    Object.entries(COMPANY_CENTER_UNIT_LOCATION_MAP).map(([company, centers]) => [
      company,
      Object.keys(centers).map((center) => ({ value: center, label: center }))
    ])
  )
};

export const UNIT_OPTIONS_BY_CENTER: Record<string, SelectOption[]> = Object.values(COMPANY_CENTER_UNIT_LOCATION_MAP).reduce<Record<string, SelectOption[]>>((acc, centers) => {
  for (const [center, details] of Object.entries(centers)) {
    acc[center] = details.units.map((unit) => ({ value: unit, label: unit }));
  }
  return acc;
}, {});

export const LOCATION_OPTIONS_BY_UNIT: Record<string, SelectOption[]> = Object.values(COMPANY_CENTER_UNIT_LOCATION_MAP).reduce<Record<string, SelectOption[]>>((acc, centers) => {
  for (const details of Object.values(centers)) {
    for (const unit of details.units) {
      const map = new Map((acc[unit] ?? []).map((option) => [option.value, option]));
      for (const location of details.locations) {
        map.set(location, { value: location, label: location });
      }
      acc[unit] = Array.from(map.values());
    }
  }
  return acc;
}, {});

export const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "I1", label: "Cat 1 - Segurança", description: "Investimentos voltados à melhoria da segurança ocupacional, higiene do trabalho, segurança industrial ou atendimento a requisitos legais relacionados à segurança." },
  { value: "I2", label: "Cat 2 - Crescimento", description: "Investimentos para produzir novos produtos, entrar em novos mercados ou aumentar a capacidade de ativos existentes. Pode incluir projetos greenfield, brownfield, debottlenecking e expansão." },
  { value: "I3", label: "Cat 3 - Modificações", description: "Investimentos para redução de custos, aumento de qualidade, melhoria de produtividade, aumento de capacidade específica ou adequações em ativos existentes." },
  { value: "I4", label: "Cat 4 - Manutenção", description: "Investimentos de reposição ou renovação destinados a manter o nível operacional dos ativos, substituindo ou recuperando equipamentos, instalações ou componentes obsoletos." },
  { value: "I5", label: "Cat 5 - Renovações", description: "Grandes reformas, reconstruções ou renovações relevantes de ativos industriais, normalmente associadas à extensão de vida útil, confiabilidade e continuidade operacional." },
  { value: "I6", label: "Cat 6 - Meio Ambiente", description: "Investimentos voltados à melhoria ambiental ou atendimento a requisitos legais ambientais. Ex.: tratamento de efluentes, controle de emissões, resíduos e adequações ambientais." },
  { value: "I7", label: "Cat 7 - Informatização", description: "Investimentos de TI, sistemas, infraestrutura digital, cloud, segurança cibernética, renovação de software/hardware e soluções digitais corporativas." },
  { value: "I8", label: "Cat 8 - Pesquisa e Desenvolvimento", description: "Investimentos em estudos, pilotos, pesquisas, desenvolvimento tecnológico, testes e iniciativas de inovação técnica ou operacional." },
  { value: "I9", label: "Cat 9 - SPA e Requisitos Legais Crescimento", description: "Investimentos de crescimento necessários para atendimento de acordos comerciais, compromissos de venda/compra ou obrigações legais relacionadas a expansão/crescimento." },
  { value: "J1", label: "Cat 10 - SPA e Req. Legais Manut. e Meio Ambiente", description: "Investimentos de manutenção ou meio ambiente necessários para atendimento de acordos comerciais, compromissos contratuais ou obrigações legais." },
  { value: "J2", label: "Cat 11 - Cilindros de Laminadores", description: "Investimentos para aquisição ou reposição de cilindros de laminação, controlados e acompanhados como envelope específico quando aplicável." },
  { value: "J3", label: "Cat 12 - Energia", description: "Investimentos ligados a energia, eficiência energética, infraestrutura energética, redução de consumo, mudança de matriz energética ou melhoria de desempenho energético." }
];
export const INVESTMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "CILINDROS_E_DISCOS", label: "CILINDROS E DISCOS", description: "Investimentos voltados à aquisição ou reposição de cilindros de laminação e discos utilizados nos processos produtivos, essenciais para conformação do aço e manutenção da qualidade dimensional dos produtos." },
  { value: "ESTRATEGICOS", label: "ESTRATÉGICOS", description: "Projetos de maior relevância para o negócio, normalmente ligados a crescimento, expansão de capacidade, novos produtos, redução estrutural de custos ou ganhos significativos de competitividade." },
  { value: "NORMATIVO", label: "NORMATIVO", description: "Investimentos necessários para manter a capacidade produtiva, atender requisitos obrigatórios, preservar continuidade operacional ou cumprir exigências técnicas, legais, normativas ou corporativas." },
  { value: "RELINES_GRANDES_REFORMAS", label: "RELINES (GRANDES REFORMAS)", description: "Reformas estruturais de grande porte em equipamentos críticos, como altos-fornos, convertedores ou fornos de reaquecimento, visando prolongar a vida útil dos ativos e manter a confiabilidade operacional." }
];

export const ASSET_TYPE_OPTIONS: SelectOption[] = [
  { value: "01", label: "01 - EDIFICAÇÕES/BENFEITORIAS EM IMÓVEIS PRÓPRIOS", description: "Investimentos em construções, reformas, melhorias ou benfeitorias realizadas em imóveis próprios da empresa." },
  { value: "02", label: "02 - EDIFICAÇÕES/BENFEITORIAS EM IMÓVEIS TERCEIROS", description: "Investimentos em construções, reformas, melhorias ou benfeitorias realizadas em imóveis de terceiros utilizados pela empresa." },
  { value: "03", label: "03 - MÁQUINAS/EQUIPAMENTOS/INSTALAÇÃO", description: "Investimentos em máquinas, equipamentos industriais, instalações produtivas, sistemas físicos de produção e ativos diretamente ligados à operação." },
  { value: "06", label: "06 - VEÍCULOS", description: "Investimentos em aquisição, substituição ou adequação de veículos utilizados nas operações, logística, manutenção, apoio ou atividades administrativas." },
  { value: "99", label: "99 - INFORMÁTICA (HARDWARE/SOFTWARE)", description: "Investimentos em hardware, software, infraestrutura de TI, sistemas, equipamentos de informática, licenças, redes ou soluções digitais corporativas." }
];
export const KPI_TYPE_OPTIONS: SelectOption[] = [
  { value: "PRODUTIVIDADE", label: "PRODUTIVIDADE" },
  { value: "SAUDE_E_SEGURANCA", label: "SAÚDE E SEGURANÇA" },
  { value: "OUTROS", label: "OUTROS" }
];

export const ROCE_AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: "SIM", label: "SIM" },
  { value: "NAO", label: "NÃO" }
];

export const ROCE_CLASS_OPTIONS: SelectOption[] = [
  { value: "GANHO", label: "GANHO" },
  { value: "PERDA", label: "PERDA" },
  { value: "AMBOS", label: "AMBOS" }
];

export const OPERATIONAL_CATEGORY_OPTIONS: SelectOption[] = [
  {
    value: "AQUISICAO E INSTALACAO INDUSTRIAL",
    label: "AQUISICAO E INSTALACAO INDUSTRIAL",
    description: "Use para compra, substituição ou instalação de equipamentos industriais ligados diretamente à operação produtiva. Ex.: máquinas, bombas, compressores, pontes rolantes, sistemas industriais e utilidades de produção."
  },
  {
    value: "MANUTENCAO INDUSTRIAL PESADA",
    label: "MANUTENCAO INDUSTRIAL PESADA",
    description: "Use para reforma, recuperação, overhaul ou intervenção relevante em ativos industriais existentes. Ex.: reforma de ponte rolante, recuperação de forno, substituição crítica de componentes ou grandes paradas de manutenção."
  },
  {
    value: "OBRAS CIVIS E INFRAESTRUTURA INDUSTRIAL",
    label: "OBRAS CIVIS E INFRAESTRUTURA INDUSTRIAL",
    description: "Use para construção, adequação ou recuperação de infraestrutura física industrial. Ex.: fundações, bases de equipamentos, pisos industriais, galpões, estruturas metálicas e edificações industriais."
  },
  {
    value: "ADEQUACAO NORMATIVA SEGURANCA E MEIO AMBIENTE",
    label: "ADEQUACAO NORMATIVA SEGURANCA E MEIO AMBIENTE",
    description: "Use para projetos necessários ao atendimento de normas, requisitos legais, segurança operacional, compliance ou meio ambiente. Ex.: NR-12, proteções, contenção ambiental, licenças e mitigação de riscos."
  },
  {
    value: "AUTOMACAO SISTEMAS E DIGITALIZACAO INDUSTRIAL",
    label: "AUTOMACAO SISTEMAS E DIGITALIZACAO INDUSTRIAL",
    description: "Use para automação, controle, sensores, PLC, supervisório, integração de sistemas industriais, coleta automática de dados e digitalização de processos produtivos."
  },
  {
    value: "ENGENHARIA ESTUDOS E VIABILIDADE",
    label: "ENGENHARIA ESTUDOS E VIABILIDADE",
    description: "Use para estudos técnicos, engenharia conceitual, engenharia básica/detalhada ou análise de viabilidade. Ex.: FEL, estudo de capacidade, análise técnica de alternativas e engenharia para futura implantação."
  },
  {
    value: "INFRAESTRUTURA ADMINISTRATIVA TI E FACILITIES",
    label: "INFRAESTRUTURA ADMINISTRATIVA TI E FACILITIES",
    description: "Use para infraestrutura administrativa, TI corporativa, audiovisual, mobiliário, salas, equipamentos de apoio e facilities. Ex.: notebooks, TVs, monitores, salas de reunião, rede administrativa e mobiliário."
  }
];

export const OPERATIONAL_COMPLEXITY_OPTIONS: SelectOption[] = [
  {
    value: "BAIXA",
    label: "BAIXA",
    description: "Use para projetos simples, com baixo risco, poucas etapas, baixa dependência entre áreas e necessidade reduzida de acompanhamento. O sistema gera 2 marcos e 1 atividade por marco."
  },
  {
    value: "MEDIA",
    label: "MEDIA",
    description: "Use para projetos com planejamento, contratação, instalação ou coordenação entre áreas, mas sem alta criticidade operacional. O sistema gera 4 marcos e 2 atividades por marco."
  },
  {
    value: "ALTA",
    label: "ALTA",
    description: "Use para projetos críticos, com múltiplas etapas, fornecedores, interfaces técnicas, parada operacional, risco de segurança/compliance ou alta necessidade de governança. O sistema gera 6 marcos e 3 atividades por marco."
  }
];

const PEP_ELEMENT_OPTIONS_DEFAULT: SelectOption[] = [
  { value: "DESP.ENGENHARIA / DETALHAMENTO PROJETO", label: "DESP.ENGENHARIA / DETALHAMENTO PROJETO" },
  { value: "AQUISIÇÃO DE EQUIPAMENTOS NACIONAIS", label: "AQUISIÇÃO DE EQUIPAMENTOS NACIONAIS" },
  { value: "AQUISIÇÃO DE EQUIPAMENTOS IMPORTADOS", label: "AQUISIÇÃO DE EQUIPAMENTOS IMPORTADOS" },
  { value: "AQUISIÇÃO DE VEÍCULOS", label: "AQUISIÇÃO DE VEÍCULOS" },
  { value: "DESPESAS COM OBRAS CIVIS", label: "DESPESAS COM OBRAS CIVIS" },
  { value: "DESP.MONTAGEM EQUIPTOS/ESTRUTURAS/OUTRAS", label: "DESP.MONTAGEM EQUIPTOS/ESTRUTURAS/OUTRAS" },
  { value: "AQ.DE COMPONENTES/MAT.INSTAL./FERRAMENTA", label: "AQ.DE COMPONENTES/MAT.INSTAL./FERRAMENTA" },
  { value: "DESPESAS COM MEIO AMBIENTE", label: "DESPESAS COM MEIO AMBIENTE" },
  { value: "DESPESAS COM SEGURANÇA", label: "DESPESAS COM SEGURANÇA" },
  { value: "DESPESAS COM SEGUROS", label: "DESPESAS COM SEGUROS" },
  { value: "DESP.CONSULTORIA INTERNA (AMS)-TEC.INFOR", label: "DESP.CONSULTORIA INTERNA (AMS)-TEC.INFOR" },
  { value: "DESP.CONSULTORIA EXTERNA - TEC.INFOR", label: "DESP.CONSULTORIA EXTERNA - TEC.INFOR" },
  { value: "AQUISIÇÃO DE HARDWARE (NOTEBOOKS, ETC)", label: "AQUISIÇÃO DE HARDWARE (NOTEBOOKS, ETC)" },
  { value: "AQUISIÇÃO DE SOFTWARE", label: "AQUISIÇÃO DE SOFTWARE" },
  { value: "AQUISIÇÃO DE IMÓVEIS", label: "AQUISIÇÃO DE IMÓVEIS" },
  { value: "DESP.GERENCIAMENTO E COORDENAÇÃO", label: "DESP.GERENCIAMENTO E COORDENAÇÃO" },
  { value: "CONTINGÊNCIAS", label: "CONTINGÊNCIAS" },
  { value: "CILINDROS E DISCOS DE LAMINAÇÃO", label: "CILINDROS E DISCOS DE LAMINAÇÃO" }
];

const PEP_ELEMENT_OPTIONS_BF00: SelectOption[] = [
  { value: "VIGA", label: "VIGA" },
  { value: "TUBO DE ATIÇO", label: "TUBO DE ATIÇO" },
  { value: "TELHADO", label: "TELHADO" },
  { value: "PORTAS", label: "PORTAS" },
  { value: "PISO E MURETA DE APOIO", label: "PISO E MURETA DE APOIO" },
  { value: "PISO", label: "PISO" },
  { value: "PILAR", label: "PILAR" },
  { value: "PAREDE DEFLETORA", label: "PAREDE DEFLETORA" },
  { value: "PAREDE", label: "PAREDE" },
  { value: "LAYOUT CÉLULA DE QUEIMA", label: "LAYOUT CÉLULA DE QUEIMA" },
  { value: "FUNDAÇÃO", label: "FUNDAÇÃO" },
  { value: "ELÉTRICA/AUTOMAÇÃO", label: "ELÉTRICA/AUTOMAÇÃO" },
  { value: "ELÉTRICA E INSTRUMENTAÇÃO", label: "ELÉTRICA E INSTRUMENTAÇÃO" },
  { value: "DUTOS PASSAGEM GASES", label: "DUTOS PASSAGEM GASES" },
  { value: "DUTO METÁLICO", label: "DUTO METÁLICO" },
  { value: "CÚPULA", label: "CÚPULA" },
  { value: "CHAMINÉ METÁLICA", label: "CHAMINÉ METÁLICA" },
  { value: "CHAMINÉ CAPELA", label: "CHAMINÉ CAPELA" },
  { value: "CENTRAL DE ALCATRÃO", label: "CENTRAL DE ALCATRÃO" },
  { value: "CÉLULA DE QUEIMA", label: "CÉLULA DE QUEIMA" },
  { value: "CÂMARAS", label: "CÂMARAS" },
  { value: "CAIXAS DEFLETORAS", label: "CAIXAS DEFLETORAS" },
  { value: "CAIXA DE COLETA DE ALCATRÃO", label: "CAIXA DE COLETA DE ALCATRÃO" },
  { value: "INSTALAÇÕES INDUSTRIAIS", label: "INSTALAÇÕES INDUSTRIAIS" },
  { value: "INSTALAÇÕES PREDIAIS", label: "INSTALAÇÕES PREDIAIS" },
  { value: "COMPUTADORES E PERIFÉRICOS", label: "COMPUTADORES E PERIFÉRICOS" },
  { value: "SOFTWARES", label: "SOFTWARES" },
  { value: "CERTIFICAÇÕES E LICENÇAS", label: "CERTIFICAÇÕES E LICENÇAS" },
  { value: "INFRAESTRUTURA UPC'S", label: "INFRAESTRUTURA UPC'S" },
  { value: "MÓDULOS MOVIMENTAÇÃO", label: "MÓDULOS MOVIMENTAÇÃO" },
  { value: "MÓDULOS MECANIZAÇÃO", label: "MÓDULOS MECANIZAÇÃO" },
  { value: "CONSTRUÇÃO DE VIVEIROS", label: "CONSTRUÇÃO DE VIVEIROS" },
  { value: "MELHORIAS INDUSTRIAIS", label: "MELHORIAS INDUSTRIAIS" },
  { value: "MELHORIAS AMBIENTAIS", label: "MELHORIAS AMBIENTAIS" },
  { value: "TECNOLOGIA DA INFORMAÇÃO", label: "TECNOLOGIA DA INFORMAÇÃO" },
  { value: "MÁQUINAS E EQUIPAMENTOS", label: "MÁQUINAS E EQUIPAMENTOS" },
  { value: "FERRAMENTAS", label: "FERRAMENTAS" },
  { value: "IMPLEMENTOS AGRÍCOLAS", label: "IMPLEMENTOS AGRÍCOLAS" },
  { value: "MÓVEIS E UTENSÍLIOS", label: "MÓVEIS E UTENSÍLIOS" },
  { value: "VEÍCULOS LEVES", label: "VEÍCULOS LEVES" },
  { value: "VEÍCULOS PESADOS", label: "VEÍCULOS PESADOS" }
];

export function getPepElementOptions(company?: string): SelectOption[] {
  return company === "BF00" ? PEP_ELEMENT_OPTIONS_BF00 : PEP_ELEMENT_OPTIONS_DEFAULT;
}

export function ensurePepElementOption(options: SelectOption[], value?: string): SelectOption[] {
  const current = String(value ?? "").trim();
  if (!current) return options;
  if (options.some((option) => option.value === current)) return options;
  return [...options, { value: current, label: current }];
}

export const INVESTMENT_LEVEL_OPTIONS: Array<SelectOption & { minUsd: number; maxUsd?: number }> = [
  { value: "N1", label: "N1 - Board of Directors", minUsd: 150_000_000 },
  { value: "N2", label: "N2 - IAC/Executive Office", minUsd: 10_000_000, maxUsd: 150_000_000 },
  { value: "N3", label: "N3 - Pre-IAC", minUsd: 2_000_000, maxUsd: 10_000_000 },
  { value: "N4", label: "N4 - Local Segment", minUsd: 0, maxUsd: 2_000_000 }
];

export function buildYearOptions(range = 5): SelectOption[] {
  const current = new Date().getFullYear();
  return Array.from({ length: range + 1 }, (_, i) => {
    const year = current + i;
    return { value: String(year), label: String(year) };
  });
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}


export function ensureProgramOption(options: SelectOption[], value?: string): SelectOption[] {
  const current = String(value ?? "").trim();
  if (!current) return options;
  if (options.some((option) => option.value === current)) return options;
  return [...options, { value: current, label: current }];
}
