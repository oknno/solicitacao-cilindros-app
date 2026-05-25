import type { CSSProperties } from "react";

import { uiTokens } from "../../../components/ui/tokens";

export const projectsPageStyles: Record<string, CSSProperties> = {
  pageWrap: {
    background: uiTokens.colors.appBackground,
    height: "100%",
    minHeight: 0,
    padding: uiTokens.spacing.md,
    overflow: "hidden",
    display: "grid",
    gridTemplateRows: "auto 1fr"
  },
  grid: {
    display: "grid",
    minHeight: 0,
    gridTemplateColumns: "minmax(0, 2fr) minmax(420px, 1fr)",
    gap: uiTokens.spacing.md,
    marginTop: uiTokens.spacing.md,
    overflow: "hidden"
  },
  listCard: { display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, padding: uiTokens.spacing.sm },
  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  helperText: { fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted },
  summaryCard: { overflow: "hidden", minHeight: 0, padding: uiTokens.spacing.md },
};
