import type { ReactNode } from "react";
import type { MaterialRequestTechnicalData } from "../../../domain/materialRequest";
import { Field } from "../ui/Field";
import { wizardLayoutStyles } from "../../pages/ProjectsPage/components/wizard/wizardLayoutStyles";
import { formatEmpty } from "./materialRequestSummaryFormatters";

type TechnicalDataKey = keyof MaterialRequestTechnicalData;

interface TechnicalFieldDefinition {
  key: TechnicalDataKey;
  label: string;
}

interface TechnicalGroupDefinition {
  title: string;
  columns: 3 | 4 | 5;
  fields: TechnicalFieldDefinition[];
}

const MATERIAL_REQUEST_TECHNICAL_GROUPS: TechnicalGroupDefinition[] = [
  {
    title: "Identificação industrial",
    columns: 3,
    fields: [
      { key: "refrol", label: "REFROL" }, { key: "site", label: "SITE" }, { key: "mill", label: "MILL" },
      { key: "standType", label: "STAND TYPE" }, { key: "rollType", label: "ROLL TYPE" }, { key: "standLocalName", label: "STAND LOCAL NAME" },
    ],
  },
  {
    title: "Perfil e desenhos",
    columns: 5,
    fields: [
      { key: "profile", label: "PROFILE" }, { key: "profileCode", label: "PROFILE Code" }, { key: "rollDrawing", label: "ROLL DRAWING" },
      { key: "groovesCaliberDrawing", label: "GROOVES (CALIBER) DRAWING" }, { key: "calibrationNeed", label: "CALIBRATION NEED (Yes/No)" },
    ],
  },
  {
    title: "Dimensões e peso",
    columns: 3,
    fields: [
      { key: "diamExt", label: "DIAM EXT" }, { key: "scrapDiam", label: "SCRAP DIAM" }, { key: "diamInt", label: "DIAM INT" },
      { key: "lengthTable", label: "LENGTH TABLE" }, { key: "lengthTotal", label: "LENGTH TOTAL" }, { key: "finalWeight", label: "FINAL WEIGHT" },
    ],
  },
  {
    title: "Especificação",
    columns: 4,
    fields: [
      { key: "neededHardness", label: "NEEDED HARDNESS" }, { key: "technology", label: "TECHNOLOGY" },
      { key: "grade", label: "GRADE" }, { key: "delivery", label: "DELIVERY" },
    ],
  },
];

function TechnicalDataSectionContainer(props: { children: ReactNode }) {
  return (
    <section className="material-request-technical-data">
      <h3 className="material-request-technical-data__title">Dados técnicos do material</h3>
      <div className="material-request-technical-data__groups">{props.children}</div>
    </section>
  );
}

function technicalGroupGridClass(columns: TechnicalGroupDefinition["columns"]) {
  return `material-request-technical-data__grid material-request-technical-data__grid--${columns}-columns`;
}

export function MaterialRequestTechnicalDataFormSection(props: {
  value: MaterialRequestTechnicalData;
  onChange: (value: MaterialRequestTechnicalData) => void;
}) {
  return (
    <TechnicalDataSectionContainer>
      {MATERIAL_REQUEST_TECHNICAL_GROUPS.map((group) => (
        <section key={group.title} className="material-request-technical-data__group">
          <h4 className="material-request-technical-data__group-title">{group.title}</h4>
          <div className={technicalGroupGridClass(group.columns)}>
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
    </TechnicalDataSectionContainer>
  );
}

export function MaterialRequestTechnicalDataViewSection(props: { technicalData?: MaterialRequestTechnicalData }) {
  return (
    <TechnicalDataSectionContainer>
      {MATERIAL_REQUEST_TECHNICAL_GROUPS.map((group) => (
        <section key={group.title} className="material-request-technical-data__group">
          <h4 className="material-request-technical-data__group-title">{group.title}</h4>
          <div className={technicalGroupGridClass(group.columns)}>
            {group.fields.map((field) => (
              <div key={field.key} className="material-request-technical-data__readonly-field">
                <Field label={field.label}>{formatEmpty(props.technicalData?.[field.key])}</Field>
              </div>
            ))}
          </div>
        </section>
      ))}
    </TechnicalDataSectionContainer>
  );
}
