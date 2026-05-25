import { useCallback, useEffect, useMemo, useState } from "react";

export type StepKey = "project" | "execution" | "review";

export function useWizardNavigation(params: {
  readOnly: boolean;
  summaryOnlyView: boolean;
  validateCurrentStep: (currentStep: StepKey) => void;
  notify: (message: string, tone?: "success" | "error" | "info") => void;
  getForwardBlockingMessage?: (currentStep: StepKey, nextStep: StepKey) => string | null;
}) {
  const [step, setStep] = useState<StepKey>(params.summaryOnlyView ? "review" : "project");
  const [transitioning, setTransitioning] = useState(false);

  const stepOrder = useMemo<StepKey[]>(() => (params.summaryOnlyView ? ["review"] : ["project", "execution", "review"]), [params.summaryOnlyView]);
  const currentStepIndex = stepOrder.indexOf(step);

  useEffect(() => {
    if (params.summaryOnlyView) {
      setStep("review");
    }
  }, [params.summaryOnlyView]);

  const tryStepChange = useCallback(async (nextStep: StepKey, trigger: "tab" | "button") => {
    if (params.readOnly || transitioning || nextStep === step) return;

    const nextIndex = stepOrder.indexOf(nextStep);
    if (nextIndex < 0) return;

    const canNavigateBack = nextIndex < currentStepIndex;
    const canNavigateForward = nextIndex === currentStepIndex + 1;
    if (!canNavigateBack && !canNavigateForward) return;

    if (canNavigateBack) {
      setStep(nextStep);
      return;
    }

    const blockingMessage = params.getForwardBlockingMessage?.(step, nextStep);
    if (blockingMessage) {
      params.notify(blockingMessage, "error");
      return;
    }

    setTransitioning(true);
    try {
      params.validateCurrentStep(step);
      setStep(nextStep);
    } catch (e: unknown) {
      const message = e instanceof Error && e.message ? e.message : "Há pendências nesta etapa.";
      const context = trigger === "tab" ? "Corrija as pendências antes de avançar pela barra de etapas." : "Corrija as pendências antes de avançar.";
      params.notify(`${message} ${context}`, "error");
    } finally {
      setTransitioning(false);
    }
  }, [currentStepIndex, params, step, stepOrder, transitioning]);

  const goNext = useCallback(async () => {
    const nextStep = stepOrder[currentStepIndex + 1];
    if (!nextStep) return;
    await tryStepChange(nextStep, "button");
  }, [currentStepIndex, stepOrder, tryStepChange]);

  const goBack = useCallback(() => {
    const previousStep = stepOrder[currentStepIndex - 1];
    if (!previousStep) return;
    setStep(previousStep);
  }, [currentStepIndex, stepOrder]);

  return {
    step,
    stepOrder,
    currentStepIndex,
    transitioning,
    tryStepChange,
    goNext,
    goBack
  };
}
