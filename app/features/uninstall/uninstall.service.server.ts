import { parseWithSchema } from "../../lib/validation";
import {
  uninstallFeedbackRepository,
  type UninstallFeedbackRecord,
  type UninstallFeedbackRepository,
} from "../../repositories/uninstall-feedback.repository.server";
import { logger } from "../../services/logger.server";
import {
  submitUninstallFeedbackSchema,
  type SubmitUninstallFeedbackInput,
} from "./uninstall.schema";

export class UninstallFeedbackService {
  constructor(
    private readonly feedbacks: UninstallFeedbackRepository = uninstallFeedbackRepository,
  ) {}

  async submit(
    shopId: string,
    input: unknown,
  ): Promise<UninstallFeedbackRecord> {
    const data = parseWithSchema(
      submitUninstallFeedbackSchema,
      input,
      "Invalid uninstall feedback",
    ) as SubmitUninstallFeedbackInput;

    const record = await this.feedbacks.create({
      shopId,
      reasons: data.reasons,
      details: data.details,
    });

    logger.info("uninstall_feedback.submitted", {
      shopId,
      reasonCount: data.reasons.length,
      hasDetails: Boolean(data.details),
    });

    return record;
  }
}

export const uninstallFeedbackService = new UninstallFeedbackService();
