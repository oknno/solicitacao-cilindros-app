import { type CSSProperties } from "react";

import { Badge } from "../../../../components/ui/Badge";
import { Field } from "../../../../components/ui/Field";
import { Section } from "../../../../components/ui/Section";
import { uiTokens } from "../../../../components/ui/tokens";
import { wizardLayoutStyles } from "./wizardLayoutStyles";

type TabStatus = "completed" | "current" | "available" | "blocked";
type FieldValue = string | number | null | undefined;

export function Tab(props: { label: string; indexLabel: string; status: TabStatus; onClick: () => void }) {
  const disabled = props.status === "blocked";
  const indicator = props.status === "completed" ? "✓" : props.indexLabel;

  return (
    <button
      type="button"
      style={{
        ...styles.tab,
        ...(props.status === "current" ? styles.tabCurrent : {}),
        ...(disabled ? styles.tabBlocked : {})
      }}
      onClick={props.onClick}
      disabled={disabled}
      aria-current={props.status === "current" ? "step" : undefined}
    >
      <span
        style={{
          ...styles.tabDot,
          ...(props.status === "completed" ? styles.tabDotCompleted : {}),
          ...(props.status === "current" ? styles.tabDotCurrent : {})
        }}
      >
        {indicator}
      </span>
      <span>{props.label}</span>
    </button>
  );
}

export function SummaryBadge(props: { label: string; value: FieldValue }) {
  return <Badge text={`${props.label}: ${props.value}`} />;
}

export function SectionTitle(props: { title: string; subtitle?: string }) {
  return <Section title={props.title} subtitle={props.subtitle} />;
}

function FieldInput(props: { label: string; value: FieldValue; placeholder?: string; helperText?: string; disabled?: boolean; onChange: (v: string) => void; inputMode?: "numeric" | "text"; type?: "text" | "number" | "date"; min?: string; max?: string; maxLength?: number; step?: string }) {
  const resolvedPlaceholder = props.placeholder ?? (props.type === "date" ? "dd/mm/aaaa" : props.type === "number" ? "Digite um valor" : "Digite aqui");

  return (
    <Field label={props.label}>
      <>
        <input
          value={String(props.value ?? "")}
          placeholder={resolvedPlaceholder}
          disabled={props.disabled}
          inputMode={props.inputMode}
          type={props.type ?? "text"}
          min={props.min}
          max={props.max}
          maxLength={props.maxLength}
          step={props.step}
          onChange={(e) => props.onChange(e.target.value)}
          style={styles.input}
        />
        {props.helperText ? <small style={styles.helperText}>{props.helperText}</small> : null}
      </>
    </Field>
  );
}

export function FieldText(props: { label: string; value: FieldValue; placeholder?: string; helperText?: string; disabled?: boolean; maxLength?: number; onChange: (v: string) => void }) {
  return <FieldInput {...props} />;
}

export function FieldNumber(props: { label: string; value: FieldValue; placeholder?: string; disabled?: boolean; min?: string; max?: string; onChange: (v: string) => void }) {
  return <FieldInput {...props} inputMode="numeric" type="number" step="1" />;
}

const styles: Record<string, CSSProperties> = {
  tab: {
    borderRadius: uiTokens.radius.pill,
    padding: "6px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${uiTokens.colors.border}`,
    background: uiTokens.colors.surface,
    color: uiTokens.colors.textMuted,
    cursor: "pointer",
    fontWeight: 600
  },
  tabCurrent: {
    color: uiTokens.colors.textStrong,
    borderColor: uiTokens.colors.accent,
    background: uiTokens.colors.accentSoft
  },
  tabBlocked: {
    opacity: 0.55,
    cursor: "not-allowed"
  },
  tabDot: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: `1px solid ${uiTokens.colors.border}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    background: uiTokens.colors.surfaceMuted
  },
  tabDotCompleted: {
    borderColor: uiTokens.stateTones.success.fg,
    background: uiTokens.stateTones.success.fg,
    color: uiTokens.colors.surface
  },
  tabDotCurrent: {
    borderColor: uiTokens.colors.accent,
    color: uiTokens.colors.accent,
    background: uiTokens.colors.surface
  },
  input: wizardLayoutStyles.input,
  helperText: {
    color: uiTokens.colors.textMuted,
    fontSize: uiTokens.typography.xs
  }
};

export function FieldDate(props: { label: string; value: FieldValue; placeholder?: string; disabled?: boolean; min?: string; max?: string; onChange: (v: string) => void }) {
  return <FieldInput {...props} type="date" placeholder={props.placeholder ?? "dd/mm/aaaa"} />;
}

export function FieldSelect(props: { label: string; value: FieldValue; disabled?: boolean; options: Array<{ value: string; label: string; description?: string }>; placeholder?: string; onChange: (v: string) => void }) {
  const selectedValue = String(props.value ?? "");
  return (
    <Field label={props.label}>
      <select value={selectedValue} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)} style={styles.input}>
        <option value="">{props.placeholder ?? "Selecione..."}</option>
        {props.options.map((option) => <option key={option.value} value={option.value} title={option.description}>{option.label}</option>)}
      </select>
    </Field>
  );
}
