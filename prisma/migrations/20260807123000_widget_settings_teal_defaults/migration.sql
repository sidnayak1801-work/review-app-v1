-- Align new WidgetSettings rows with the theme extension accent default (#0f766e).
-- Existing shops keep their current colors; only the column defaults change.

ALTER TABLE "WidgetSettings"
  ALTER COLUMN "accentColor" SET DEFAULT '#0f766e';

ALTER TABLE "WidgetSettings"
  ALTER COLUMN "primaryButtonColor" SET DEFAULT '#0f766e';
