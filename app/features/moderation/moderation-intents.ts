export const MODERATION_INTENTS = {
  UPDATE_STATUS: "update-status",
  DELETE: "delete",
  SET_FEATURED: "set-featured",
  SET_REPLY: "set-reply",
  SET_ANSWER: "set-answer",
} as const;

export type ModerationIntent =
  (typeof MODERATION_INTENTS)[keyof typeof MODERATION_INTENTS];
