import type { MaterialRequestTechnicalData } from "../../../domain/materialRequest";
import { Field } from "../ui/Field";
import { uiTokens } from "../ui/tokens";
import { wizardLayoutStyles } from "../../pages/ProjectsPage/components/wizard/wizardLayoutStyles";
import { CollapsibleSection } from "./MaterialRequestViewSections";
import { formatEmpty } from "./materialRequestSummaryFormatters";

type TechnicalDataKey = keyof MaterialRequestTechnicalData;

interface TechnicalFieldDefinition {
  key: TechnicalDataKey;
  label: string;
}

interface TechnicalGroupDefinition {
  title: string;
  fields: TechnicalFieldDefinition[];
}

const MATERIAL_REQUEST_TECHNICAL_GROUPS: TechnicalGroupDefinition[] = [
  {
    title: "Identificação industrial",
    fields: [
      { key: "refrol", label: "REFROL" }, { key: "site", label: "SITE" }, { key: "mill", label: "MILL" },
      { key: "standType", label: "STAND TYPE" }, { key: "rollType", label: "ROLL TYPE" }, { key: "standLocalName", label: "STAND LOCAL NAME" },
    ],
  },
  {
    title: "Perfil e desenhos",
    fields: [
      { key: "profile", label: "PROFILE" }, { key: "profileCode", label: "PROFILE Code" }, { key: "rollDrawing", label: "ROLL DRAWING" },
      { key: "groovesCaliberDrawing", label: "GROOVES (CALIBER) DRAWING" }, { key: "calibrationNeed", label: "CALIBRATION NEED (Yes/No)" },
    ],
  },
  {
    title: "Dimensões e peso",
    fields: [
      { key: "diamExt", label: "DIAM EXT" }, { key: "scrapDiam", label: "SCRAP DIAM" }, { key: "diamInt", label: "DIAM INT" },
      { key: "lengthTable", label: "LENGTH TABLE" }, { key: "lengthTotal", label: "LENGTH TOTAL" }, { key: "finalWeight", label: "FINAL WEIGHT" },
    ],
  },
  {
    title: "Especificação",
    fields: [
      { key: "neededHardness", label: "NEEDED HARDNESS" }, { key: "technology", label: "TECHNOLOGY" },
      { key: "grade", label: "GRADE" }, { key: "delivery", label: "DELIVERY" },
    ],
  },
];

const responsiveGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: uiTokens.spacing.md } as const;

export function MaterialRequestTechnicalDataFormSection(props: {
  value: MaterialRequestTechnicalData;
  onChange: (value: MaterialRequestTechnicalData) => void;
}) {
  return (
    <details open style={{ border: `1px solid ${uiTokens.colors.borderStrong}`, borderRadius: uiTokens.radius.md, background: uiTokens.colors.surface }}>
      <summary style={{ cursor: "pointer", padding: uiTokens.spacing.md, fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>
        Dados técnicos do material <span style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm, fontWeight: 400 }}>(preenchimento manual opcional)</span>
      </summary>
      <div style={{ display: "grid", gap: uiTokens.spacing.lg, padding: `0 ${uiTokens.spacing.md}px ${uiTokens.spacing.md}px` }}>
        {MATERIAL_REQUEST_TECHNICAL_GROUPS.map((group) => (
          <section key={group.title} style={{ display: "grid", gap: uiTokens.spacing.sm }}>
            <h4 style={{ margin: 0, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm }}>{group.title}</h4>
            <div style={responsiveGrid}>
              {group.fields.map((field) => (
                <Field key={field.key} label={field.label}>
                  <input
                    value={props.value[field.key] ?? ""}
                    onChange={(event) => props.onChange({ ...props.value, [field.key]: event.target.value })}
                    style={wizardLayoutStyles.input}
                  />
                </Field>
              ))}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}

export function MaterialRequestTechnicalDataViewSection(props: { technicalData?: MaterialRequestTechnicalData; defaultOpen?: boolean }) {
  return (
    <CollapsibleSection title="Dados técnicos do material" defaultOpen={props.defaultOpen}>
      {MATERIAL_REQUEST_TECHNICAL_GROUPS.map((group) => (
        <section key={group.title} style={{ display: "grid", gap: uiTokens.spacing.sm }}>
          <h4 style={{ margin: 0, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm }}>{group.title}</h4>
          <div style={responsiveGrid}>
            {group.fields.map((field) => (
              <div key={field.key} style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.sm, padding: uiTokens.spacing.sm, background: uiTokens.colors.surfaceMuted }}>
                <Field label={field.label}>{formatEmpty(props.technicalData?.[field.key])}</Field>
              </div>
            ))}
          </div>
        </section>
      ))}
    </CollapsibleSection>
  );
}
