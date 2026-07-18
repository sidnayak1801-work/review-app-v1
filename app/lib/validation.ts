import { z } from "zod";

import { ValidationError } from "./domain-error";

export function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  message = "Validation failed",
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  throw new ValidationError(message, issues);
}
