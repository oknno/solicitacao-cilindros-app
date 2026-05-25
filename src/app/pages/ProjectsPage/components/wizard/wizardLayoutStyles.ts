import type { CSSProperties } from "react";

import { uiTokens } from "../../../../components/ui/tokens";

export const wizardLayoutStyles: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: uiTokens.colors.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: uiTokens.spacing.xl, zIndex: 9999 },
  modal: { width: "min(1100px, 100%)", background: uiTokens.colors.surface, borderRadius: uiTokens.radius.lg, border: `1px solid ${uiTokens.colors.border}`, overflow: "hidden", maxHeight: "92vh", display: "grid", gridTemplateRows: "auto auto 1fr auto" },
  modalHeader: { padding: uiTokens.spacing.lg, borderBottom: `1px solid ${uiTokens.colors.border}`, display: "flex", justifyContent: "space-between", gap: uiTokens.spacing.md },
  tabsRow: { padding: 10, borderBottom: `1px solid ${uiTokens.colors.border}`, display: "flex", gap: uiTokens.spacing.sm, flexWrap: "wrap" },
  body: { overflow: "auto" },
  footer: { padding: uiTokens.spacing.lg, borderTop: `1px solid ${uiTokens.colors.border}`, display: "flex", justifyContent: "space-between", gap: uiTokens.spacing.md, alignItems: "center" },
  sectionStack: { display: "grid", gap: uiTokens.spacing.lg },
  card: {
    display: "grid",
    gap: uiTokens.spacing.md,
    padding: uiTokens.spacing.lg,
    borderRadius: uiTokens.radius.md,
    border: `1px solid ${uiTokens.colors.borderMuted}`,
    background: uiTokens.colors.surfaceMuted
  },
  cardSubtle: {
    display: "grid",
    gap: uiTokens.spacing.md,
    padding: uiTokens.spacing.md,
    borderRadius: uiTokens.radius.md,
    border: `1px solid ${uiTokens.colors.borderMuted}`,
    background: uiTokens.colors.surface
  },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: uiTokens.spacing.md },
  grid2Relaxed: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: uiTokens.spacing.lg },
  journeyStack: { display: "grid", gap: uiTokens.spacing.lg },
  journeyPairGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: uiTokens.spacing.lg },
  journeyTripleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: uiTokens.spacing.md },
  box: { border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.md, overflow: "hidden" },
  boxHead: { padding: "10px 12px", fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight, background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}` },
  row: { padding: "10px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` },
  empty: { padding: uiTokens.spacing.md, color: uiTokens.colors.textMuted },
  input: { width: "100%", padding: "9px 10px", borderRadius: uiTokens.radius.sm, border: `1px solid ${uiTokens.colors.borderStrong}` },
  textareaReadable: { width: "100%", minHeight: 80 }
};
