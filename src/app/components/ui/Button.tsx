import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { uiTokens } from "./tokens";

type ButtonTone = "default" | "primary";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; children: ReactNode; style?: CSSProperties }) {
  const tone = props.tone ?? "default";
  const isDisabled = Boolean(props.disabled);
  const palette = tone === "primary"
    ? { bg: uiTokens.colors.accent, fg: uiTokens.colors.textOnAccent, bd: uiTokens.colors.accent }
    : { bg: uiTokens.colors.surface, fg: uiTokens.colors.textStrong, bd: uiTokens.colors.borderStrong };
  const disabledPalette = {
    bg: uiTokens.colors.surfaceMuted,
    fg: uiTokens.colors.textMuted,
    bd: uiTokens.colors.border,
  };
  const appliedPalette = isDisabled ? disabledPalette : palette;

  return (
    <button
      {...props}
      style={{
        appearance: "none",
        border: `1px solid ${appliedPalette.bd}`,
        background: appliedPalette.bg,
        color: appliedPalette.fg,
        padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.md - uiTokens.spacing.xxs}px`,
        borderRadius: uiTokens.radius.sm,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.7 : 1,
        fontSize: uiTokens.typography.sm,
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}
