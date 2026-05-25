import type { CSSProperties } from "react";
import { uiTokens } from "./tokens";

export const fieldControlStyles: Record<"input" | "select", CSSProperties> = {
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.md - uiTokens.spacing.xxs}px`,
    borderRadius: uiTokens.radius.sm,
    border: `1px solid ${uiTokens.colors.borderStrong}`,
    background: uiTokens.colors.surface,
    color: uiTokens.colors.textStrong
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.md - uiTokens.spacing.xxs}px`,
    borderRadius: uiTokens.radius.sm,
    border: `1px solid ${uiTokens.colors.borderStrong}`,
    background: uiTokens.colors.surface,
    color: uiTokens.colors.textStrong
  }
};
