import { calculateInvestmentLevel } from "../../../../../domain/projects/project.calculations";
import type { ProjectDraft } from "../../../../../services/sharepoint/projectsApi";
import {
  ASSET_TYPE_OPTIONS,
  buildYearOptions,
  CATEGORY_OPTIONS,
  CENTER_OPTIONS_BY_COMPANY,
  COMPANY_OPTIONS,
  EXCHANGE_RATE,
  FUNDING_SOURCE_OPTIONS,
  INVESTMENT_LEVEL_OPTIONS,
  INVESTMENT_TYPE_OPTIONS,
  KPI_TYPE_OPTIONS,
  LOCATION_OPTIONS_BY_UNIT,
  OPERATIONAL_CATEGORY_OPTIONS,
  OPERATIONAL_COMPLEXITY_OPTIONS,
  PROGRAM_OPTIONS,
  ensureProgramOption,
  ROCE_AVAILABILITY_OPTIONS,
  ROCE_CLASS_OPTIONS,
  UNIT_OPTIONS_BY_CENTER,
  todayIsoDate,
} from "./wizardOptions";
import { FieldDate, FieldNumber, FieldSelect, FieldText, SectionTitle } from "./WizardUi";
import { wizardLayoutStyles } from "./wizardLayoutStyles";
import { Field } from "../../../../components/ui/Field";
import { uiTokens } from "../../../../components/ui/tokens";

function onlyIntegerOrEmpty(value: string) {
  if (value === "") return "";
  return /^\d+$/.test(value) ? value : null;
}

function getOptionsWithFallback(options: { value: string; label: string }[] | undefined, prefix: string) {
  if (options?.length) return options;
  return Array.from({ length: 4 }, (_, i) => ({ value: `${prefix}_${i + 1}`, label: `${prefix} ${i + 1}` }));
}

function toDateInputValue(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function descriptionQualityLabel(text?: string) {
  const size = String(text ?? "").trim().length;
  if (size < 100) return { label: "Descrição curta/ruim", tone: uiTokens.colors.danger };
  if (size < 200) return { label: "Boa descrição", tone: uiTokens.stateTones.warning.fg };
  return { label: "Ótima descrição", tone: uiTokens.stateTones.success.fg };
}

export function ProjectStep(props: { draft: ProjectDraft; readOnly: boolean; onChange: (patch: Partial<ProjectDraft>) => void }) {
  const d = props.draft;
  const programOptions = ensureProgramOption(PROGRAM_OPTIONS, d.program);
  const yearOptions = buildYearOptions(5);
  const today = todayIsoDate();
  const centerOptions = getOptionsWithFallback(CENTER_OPTIONS_BY_COMPANY[d.company ?? ""], "Centro");
  const unitOptions = getOptionsWithFallback(UNIT_OPTIONS_BY_CENTER[d.center ?? ""], "Unidade");
  const locationOptions = getOptionsWithFallback(LOCATION_OPTIONS_BY_UNIT[d.unit ?? ""], "Local");
  const levelCode = calculateInvestmentLevel(d.budgetBrl, EXCHANGE_RATE);
  const levelLabel = INVESTMENT_LEVEL_OPTIONS.find((item) => item.value === levelCode)?.label ?? "";
  const startDateValue = toDateInputValue(d.startDate);
  const endDateValue = toDateInputValue(d.endDate);
  const businessNeedQuality = descriptionQualityLabel(d.businessNeed);
  const proposedSolutionQuality = descriptionQualityLabel(d.proposedSolution);
  const hasRoce = d.hasRoce === "SIM";

  return (
    <div style={{ ...wizardLayoutStyles.sectionStack, padding: 14 }}>
      <div style={wizardLayoutStyles.card}>
        <SectionTitle title="1. Sobre o Projeto" />
        <div style={wizardLayoutStyles.journeyStack}>
          <FieldText label="Nome do Projeto" value={d.Title ?? ""} maxLength={25} placeholder="Título do projeto" disabled={props.readOnly} onChange={(v) => props.onChange({ Title: v.toUpperCase().slice(0, 25) })} />

          <FieldNumber label="Orçamento do Projeto (R$)" value={d.budgetBrl ?? ""} placeholder="Ex: 500000 (sem pontos ou vírgulas)" disabled={props.readOnly} onChange={(v) => {
            const clean = onlyIntegerOrEmpty(v);
            if (clean === null) return;
            props.onChange({ budgetBrl: clean === "" ? undefined : Number(clean) });
          }} />

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect label="Ano de Aprovação" value={d.approvalYear ?? ""} options={yearOptions} disabled={props.readOnly} onChange={(v) => props.onChange({ approvalYear: v ? Number(v) : undefined })} />
            <FieldText label="Nível de Investimento" value={levelCode ? `${levelCode} - ${levelLabel}` : ""} placeholder="Calculado automaticamente (câmbio 5,4)" disabled onChange={() => {}} />
          </div>

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldDate label="Data de Início" value={startDateValue} placeholder="dd/mm/aaaa" min={today} disabled={props.readOnly} onChange={(v) => props.onChange({ startDate: v || undefined })} />
            <FieldDate label="Data de Término" value={endDateValue} placeholder="dd/mm/aaaa" min={startDateValue || today} disabled={props.readOnly} onChange={(v) => props.onChange({ endDate: v || undefined })} />
          </div>

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect
              label="Categoria operacional"
              value={(d as { operationalCategory?: string }).operationalCategory ?? ""}
              options={OPERATIONAL_CATEGORY_OPTIONS}
              disabled={props.readOnly}
              onChange={(v) => props.onChange({ operationalCategory: v || undefined } as Partial<ProjectDraft>)}
            />
            <FieldSelect
              label="Complexidade"
              value={(d as { complexity?: string }).complexity ?? ""}
              options={OPERATIONAL_COMPLEXITY_OPTIONS}
              disabled={props.readOnly}
              onChange={(v) => props.onChange({ complexity: v || undefined } as Partial<ProjectDraft>)}
            />
          </div>

          <FieldText label="Função do Projeto" value={d.projectFunction ?? ""} maxLength={35} placeholder="Ex.: Aumentar capacidade produtiva" disabled={props.readOnly} onChange={(v) => props.onChange({ projectFunction: v.toUpperCase().slice(0, 35) })} />
        </div>
      </div>

      <div style={wizardLayoutStyles.card}>
        <SectionTitle title="2. Origem e Programa" />
        <div style={wizardLayoutStyles.journeyStack}>
          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect label="Origem da Verba" value={d.fundingSource ?? ""} options={FUNDING_SOURCE_OPTIONS} disabled={props.readOnly} onChange={(v) => props.onChange({ fundingSource: v || undefined })} />
            <FieldSelect label="Programa" value={d.program ?? ""} options={programOptions} disabled={props.readOnly} onChange={(v) => props.onChange({ program: v || undefined })} />
          </div>
          {["REMANEJAMENTO", "CARRY OVER"].includes(d.fundingSource ?? "") && (
            <FieldText
              label="Projeto"
              value={d.sourceProjectCode ?? ""}
              placeholder="Informe o projeto"
              helperText={d.fundingSource === "REMANEJAMENTO" ? "Indique o projeto de origem do remanejamento." : "Indique o projeto carry over."}
              disabled={props.readOnly}
              onChange={(v) => props.onChange({ sourceProjectCode: v.toUpperCase() || undefined })}
            />
          )}
        </div>
      </div>

      <div style={wizardLayoutStyles.card}>
        <SectionTitle title="3. Informação Operacional" />

        <div style={wizardLayoutStyles.journeyStack}>
          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect label="Empresa" value={d.company ?? ""} options={COMPANY_OPTIONS} disabled={props.readOnly} onChange={(v) => props.onChange({ company: v || undefined, center: undefined, unit: undefined, location: undefined })} />
            <FieldSelect label="Centro" value={d.center ?? ""} options={centerOptions} disabled={props.readOnly || !d.company} onChange={(v) => props.onChange({ center: v || undefined, unit: undefined, location: undefined })} />
          </div>

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect label="Unidade" value={d.unit ?? ""} options={unitOptions} disabled={props.readOnly || !d.center} onChange={(v) => props.onChange({ unit: v || undefined, location: undefined })} />
            <FieldSelect label="Local de Implantação" value={d.location ?? ""} options={locationOptions} disabled={props.readOnly || !d.unit} onChange={(v) => props.onChange({ location: v || undefined })} />
          </div>

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldText label="C. Custo Depreciação" value={d.depreciationCostCenter ?? ""} placeholder="Ex.: CC-1234" disabled={props.readOnly} onChange={(v) => props.onChange({ depreciationCostCenter: v.toUpperCase() })} />
            <FieldSelect label="Categoria" value={d.category ?? ""} options={CATEGORY_OPTIONS} disabled={props.readOnly} onChange={(v) => props.onChange({ category: v || undefined })} />
          </div>

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect label="Tipo de Investimento" value={d.investmentType ?? ""} options={INVESTMENT_TYPE_OPTIONS} disabled={props.readOnly} onChange={(v) => props.onChange({ investmentType: v || undefined })} />
            <FieldSelect label="Tipo de Ativo" value={d.assetType ?? ""} options={ASSET_TYPE_OPTIONS} disabled={props.readOnly} onChange={(v) => props.onChange({ assetType: v || undefined })} />
          </div>

          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldText label="Usuário do Projeto" value={d.projectUser ?? ""} placeholder="Ex.: JOÃO SILVA" disabled={props.readOnly} onChange={(v) => props.onChange({ projectUser: v.toUpperCase() })} />
            <FieldText label="Líder do Projeto" value={d.projectLeader ?? ""} placeholder="Ex.: MARIA SOUZA" disabled={props.readOnly} onChange={(v) => props.onChange({ projectLeader: v.toUpperCase() })} />
          </div>
        </div>
      </div>

      <div style={wizardLayoutStyles.card}>
        <SectionTitle title="4. Detalhamento Complementar" />
        <div style={wizardLayoutStyles.sectionStack}>
          <Field label="Necessidade do Negócio">
            <textarea
              value={d.businessNeed ?? ""}
              placeholder="Descreva a necessidade do negócio e o problema atual"
              disabled={props.readOnly}
              rows={4}
              onChange={(e) => props.onChange({ businessNeed: e.target.value })}
              style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: businessNeedQuality.tone }}>
              {`${String(d.businessNeed ?? "").trim().length} caracteres — ${businessNeedQuality.label}`}
            </div>
          </Field>

          <Field label="Solução da Proposta">
            <textarea
              value={d.proposedSolution ?? ""}
              placeholder="Descreva a solução proposta e o resultado esperado"
              disabled={props.readOnly}
              rows={4}
              onChange={(e) => props.onChange({ proposedSolution: e.target.value })}
              style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: proposedSolutionQuality.tone }}>
              {`${String(d.proposedSolution ?? "").trim().length} caracteres — ${proposedSolutionQuality.label}`}
            </div>
          </Field>
        </div>
      </div>

      <div style={wizardLayoutStyles.card}>
        <SectionTitle title="6. Indicadores de Desempenho" />
        <div style={wizardLayoutStyles.journeyStack}>
          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldSelect label="Tipo de KPI" value={d.kpiType ?? ""} options={KPI_TYPE_OPTIONS} disabled={props.readOnly} onChange={(v) => props.onChange({ kpiType: v || undefined })} />
            <FieldText label="Nome do KPI" value={d.kpiName ?? ""} disabled={props.readOnly} onChange={(v) => props.onChange({ kpiName: v.toUpperCase() })} />
          </div>
          <div style={wizardLayoutStyles.journeyPairGrid}>
            <FieldText label="KPI Atual" value={d.kpiCurrent ?? ""} disabled={props.readOnly} onChange={(v) => props.onChange({ kpiCurrent: v })} />
            <FieldText label="KPI Esperado" value={d.kpiExpected ?? ""} disabled={props.readOnly} onChange={(v) => props.onChange({ kpiExpected: v })} />
          </div>
          <Field label="Descrição do KPI">
            <textarea value={d.kpiDescription ?? ""} disabled={props.readOnly} rows={3} placeholder="Explique como o KPI será medido" onChange={(e) => props.onChange({ kpiDescription: e.target.value })} style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }} />
          </Field>
        </div>
      </div>

      <div style={wizardLayoutStyles.card}>
        <SectionTitle title="7. ROCE" />
        <div style={wizardLayoutStyles.journeyStack}>
          <FieldSelect
            label="Tem ROCE?"
            value={d.hasRoce ?? ""}
            options={ROCE_AVAILABILITY_OPTIONS}
            disabled={props.readOnly}
            onChange={(v) => props.onChange({
              hasRoce: v || undefined,
              ...(v === "SIM" ? {} : {
                roceGain: undefined,
                roceGainDescription: undefined,
                roceLoss: undefined,
                roceLossDescription: undefined,
                roceClassification: undefined
              })
            })}
          />

          {hasRoce && (
            <>
              <div style={wizardLayoutStyles.journeyPairGrid}>
                <FieldSelect
                  label="Classificação ROCE"
                  value={d.roceClassification ?? ""}
                  options={ROCE_CLASS_OPTIONS}
                  disabled={props.readOnly}
                  onChange={(v) => props.onChange({ roceClassification: v || undefined })}
                />
              </div>

              <div style={wizardLayoutStyles.journeyPairGrid}>
                <FieldNumber label="Ganho (R$)" value={d.roceGain ?? ""} disabled={props.readOnly} onChange={(v) => {
                  const clean = onlyIntegerOrEmpty(v);
                  if (clean === null) return;
                  props.onChange({ roceGain: clean === "" ? undefined : Number(clean) });
                }} />

                <FieldNumber label="Perda (R$)" value={d.roceLoss ?? ""} disabled={props.readOnly} onChange={(v) => {
                  const clean = onlyIntegerOrEmpty(v);
                  if (clean === null) return;
                  props.onChange({ roceLoss: clean === "" ? undefined : Number(clean) });
                }} />
              </div>

              <div style={wizardLayoutStyles.journeyPairGrid}>
                <Field label="Descrição do ganho">
                  <textarea value={d.roceGainDescription ?? ""} disabled={props.readOnly} rows={3} placeholder="Detalhe a origem do ganho projetado" onChange={(e) => props.onChange({ roceGainDescription: e.target.value })} style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }} />
                </Field>
                <Field label="Descrição da perda">
                  <textarea value={d.roceLossDescription ?? ""} disabled={props.readOnly} rows={3} placeholder="Detalhe riscos e perdas potenciais" onChange={(e) => props.onChange({ roceLossDescription: e.target.value })} style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }} />
                </Field>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
