import { Badge } from "./Badge";

type UiState = "loading" | "error" | "empty" | "success";

export function StateMessage(props: { state: UiState; message: string }) {
  const toneMap = {
    loading: "info",
    error: "danger",
    empty: "neutral",
    success: "success",
  } as const;

  return <Badge text={props.message} tone={toneMap[props.state]} />;
}
