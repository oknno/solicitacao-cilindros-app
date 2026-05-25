import type { CSSProperties, ReactNode } from "react";
import { uiTokens } from "./tokens";

export function Section(props: { title?: string; subtitle?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ display: "grid", gap: uiTokens.spacing.md, ...props.style }}>
      {(props.title || props.subtitle) && (
        <div>
          {props.title && <div style={{ fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>{props.title}</div>}
          {props.subtitle && <div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted, marginTop: 2 }}>{props.subtitle}</div>}
        </div>
      )}
      {props.children}
    </section>
  );
}
