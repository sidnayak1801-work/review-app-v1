type ToastHost = {
  toast: {
    show: (
      message: string,
      options?: { duration?: number; isError?: boolean },
    ) => void;
  };
};

export function showModerationToast(
  shopify: ToastHost,
  message: string,
  options?: { isError?: boolean },
): void {
  shopify.toast.show(message, {
    duration: 3000,
    ...(options?.isError ? { isError: true } : {}),
  });
}

export const REVIEW_TOAST = {
  published: "Review published successfully",
  hidden: "Review hidden successfully",
  featured: "Review featured successfully",
  unfeatured: "Feature removed successfully",
  replied: "Reply added successfully",
  deleted: "Review deleted successfully",
} as const;

export const QUESTION_TOAST = {
  approved: "Question approved successfully",
  hidden: "Question hidden successfully",
  unhidden: "Question published successfully",
  answered: "Answer saved successfully",
  deleted: "Question deleted successfully",
} as const;
