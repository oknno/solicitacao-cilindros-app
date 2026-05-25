import type { CSSProperties } from "react";
import { uiTokens } from "./tokens";

type Tone = "neutral" | "info" | "success" | "danger" | "warning";

const toneMap: Record<Tone, { bg: string; fg: string; bd: string }> = uiTokens.stateTones;

export function Badge(props: { text: string; tone?: Tone; style?: CSSProperties }) {
  const t = toneMap[props.tone ?? "neutral"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.fg,
        fontSize: 12,
        fontWeight: 600,
        ...props.style,
      }}
    >
      {props.text}
    </span>
  );
}
