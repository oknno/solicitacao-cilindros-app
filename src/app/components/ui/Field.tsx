import type { CSSProperties, ReactNode } from "react";
import { uiTokens } from "./tokens";

export function Field(props: { label: string; children: ReactNode; layout?: "stack" | "inline"; style?: CSSProperties }) {
  const inline = props.layout === "inline";
  return (
    <div style={{ display: "grid", gap: uiTokens.spacing.xs + uiTokens.spacing.xxs, ...(inline ? { gridTemplateColumns: "160px 1fr", alignItems: "center", gap: uiTokens.spacing.sm + uiTokens.spacing.xxs } : {}), ...props.style }}>
      <div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>{props.label}</div>
      <div style={{ fontSize: uiTokens.typography.sm, color: uiTokens.colors.textStrong }}>{props.children}</div>
    </div>
  );
}
