import type { CSSProperties, ReactNode } from "react";
import { uiTokens } from "./tokens";

export function Card(props: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: uiTokens.colors.surface,
        border: `1px solid ${uiTokens.colors.border}`,
        borderRadius: uiTokens.radius.lg,
        padding: uiTokens.spacing.md,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}
