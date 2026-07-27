import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex size-9 items-center justify-center rounded-full border border-brand/25 bg-surface text-foreground shadow-sm transition hover:scale-105 hover:bg-accent active:scale-95"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="relative size-4">
        <Sun
          className={`absolute inset-0 size-4 text-emerald-600 transition-all duration-300 ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
          aria-hidden
        />
        <Moon
          className={`absolute inset-0 size-4 text-emerald-700 transition-all duration-300 ${
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
          aria-hidden
        />
      </span>
    </button>
  );
}
