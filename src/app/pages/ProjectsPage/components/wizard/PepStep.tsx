import { useEffect, useMemo } from "react";

import { toIntOrUndefined } from "../../../../../domain/projects/project.calculations";
import type { ActivityDraftLocal, MilestoneDraftLocal, PepDraftLocal } from "../../../../../domain/projects/project.validators";
import { buildYearOptions, ensurePepElementOption, getPepElementOptions } from "./wizardOptions";
import { SectionTitle } from "./WizardUi";
import { wizardLayoutStyles } from "./wizardLayoutStyles";
import { Button } from "../../../../components/ui/Button";
import { Field } from "../../../../components/ui/Field";
import { StateMessage } from "../../../../components/ui/StateMessage";
import { uiTokens } from "../../../../components/ui/tokens";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function PepStep(props: {
  readOnly: boolean;
  needStructure: boolean;
  milestones: MilestoneDraftLocal[];
  activities: ActivityDraftLocal[];
  peps: PepDraftLocal[];
  company?: string;
  defaultYear: number;
  onChange: (next: PepDraftLocal[]) => void;
}) {
  const { readOnly, needStructure, milestones, activities, peps, company, defaultYear, onChange } = props;
  const yearOptions = buildYearOptions(5);
  const pepOptions = useMemo(() => getPepElementOptions(company), [company]);
  const canRemovePep = peps.length > 1;

  useEffect(() => {
    if (readOnly || peps.length > 0) return;
    onChange([
      {
        tempId: uid("pp"),
        Title: "",
        year: defaultYear,
        amountBrl: 0
      }
    ]);
  }, [defaultYear, onChange, peps.length, readOnly]);

  function addPep() {
    onChange([
      ...peps,
      {
        tempId: uid("pp"),
        Title: "",
        year: defaultYear,
        amountBrl: 0
      }
    ]);
  }

  function removePep(tempId: string) {
    if (!canRemovePep) return;
    onChange(peps.filter((pep) => pep.tempId !== tempId));
  }

  function updatePep(tempId: string, patch: Partial<PepDraftLocal>) {
    onChange(peps.map((pep) => (pep.tempId === tempId ? { ...pep, ...patch } : pep)));
  }

  return (
    <div style={{ padding: 14, display: "grid", gap: 12 }}>
      <SectionTitle title={needStructure ? "Elemento PEP (rateio das atividades)" : "5. Elemento PEP (projeto abaixo de 1M)"} subtitle={needStructure ? "Projeto ≥ 1M: vincule cada PEP a uma atividade." : "Projeto < 1M: preencha apenas elemento, ano e valor do PEP."} />

      <div style={wizardLayoutStyles.box}>
        <div style={wizardLayoutStyles.boxHead}>Elementos PEP ({peps.length})</div>
        {!peps.length ? (
          <div style={wizardLayoutStyles.empty}><StateMessage state="empty" message="Nenhum elemento PEP cadastrado." /></div>
        ) : (
          <div style={{ display: "grid", gap: uiTokens.spacing.md, padding: uiTokens.spacing.sm }}>
            {peps.map((pep) => (
              <div key={pep.tempId} style={{ ...wizardLayoutStyles.cardSubtle, background: uiTokens.colors.surface }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: uiTokens.spacing.sm }}>
                  <div style={{ fontWeight: 600 }}>PEP</div>
                  <Button
                    type="button"
                    disabled={readOnly || !canRemovePep}
                    onClick={() => removePep(pep.tempId)}
                    style={{ padding: "6px 10px" }}
                    aria-label="Remover PEP"
                    title="Remover PEP"
                  >
                    Remover PEP
                  </Button>
                </div>

                <Field label="Elemento PEP">
                  <select value={pep.Title} onChange={(e) => updatePep(pep.tempId, { Title: e.target.value })} style={wizardLayoutStyles.input}>
                    <option value="">Selecione o elemento...</option>
                    {ensurePepElementOption(pepOptions, pep.Title).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>

                {needStructure && (
                  <Field label="Atividade vinculada">
                    <select
                      value={pep.activityTempId ?? ""}
                      onChange={(e) => updatePep(pep.tempId, { activityTempId: e.target.value || undefined })}
                      disabled={readOnly || activities.length === 0}
                      style={wizardLayoutStyles.input}
                    >
                      <option value="">Selecione a atividade...</option>
                      {activities.map((activity) => {
                        const milestone = milestones.find((item) => item.tempId === activity.milestoneTempId);
                        return <option key={activity.tempId} value={activity.tempId}>{activity.Title} — {milestone?.Title ?? ""}</option>;
                      })}
                    </select>
                  </Field>
                )}

                <div style={wizardLayoutStyles.journeyPairGrid}>
                  <Field label="Ano do PEP">
                    <select value={String(pep.year)} onChange={(e) => updatePep(pep.tempId, { year: Number(e.target.value) })} style={wizardLayoutStyles.input}>
                      <option value="">Selecione...</option>
                      {yearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Valor do PEP (R$)">
                    <input
                      value={String(pep.amountBrl ?? "")}
                      onChange={(e) => {
                        if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
                          updatePep(pep.tempId, { amountBrl: toIntOrUndefined(e.target.value) ?? 0 });
                        }
                      }}
                      placeholder="Somente números inteiros"
                      style={wizardLayoutStyles.input}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: uiTokens.spacing.sm }}>
          <Button tone="primary" disabled={readOnly} onClick={addPep}>Adicionar PEP</Button>
        </div>
      </div>
    </div>
  );
}
