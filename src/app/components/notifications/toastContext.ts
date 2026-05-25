import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastApi = {
  notify: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);
