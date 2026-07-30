interface MutationFeedbackSource {
  error: unknown;
  isSuccess: boolean;
}
export function useMutationFeedback(source: MutationFeedbackSource, successMessage: string) {
  return { error: source.error, success: source.isSuccess ? successMessage : null };
}
