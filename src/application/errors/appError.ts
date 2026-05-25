export type AppError = {
  userMessage: string;
  technicalDetails?: string;
};

export function normalizeError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof Error) {
    return {
      userMessage: fallbackMessage,
      technicalDetails: error.message
    };
  }

  if (typeof error === "string" && error.trim()) {
    return {
      userMessage: fallbackMessage,
      technicalDetails: error
    };
  }

  return { userMessage: fallbackMessage };
}

