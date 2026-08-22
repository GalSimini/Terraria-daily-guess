"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "day" | "night";

const storageKey = "terraria-daily-guess:theme";
const themeChangeEvent = "terraria-daily-guess:theme-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange);
  return () => window.removeEventListener(themeChangeEvent, onStoreChange);
}

function getStoredTheme(): Theme {
  const savedTheme = window.localStorage.getItem(storageKey);
  if (savedTheme === "day" || savedTheme === "night") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function getServerTheme(): Theme {
  return "day";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, getServerTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme: Theme = theme === "day" ? "night" : "day";
    applyTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  const switchLabel = theme === "day" ? "Switch to night theme" : "Switch to day theme";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={switchLabel}
      aria-pressed={theme === "night"}
      title={switchLabel}
    >
      <span aria-hidden="true" className="theme-toggle__icon">
        {theme === "day" ? "☀" : "☾"}
      </span>
      <span className="theme-toggle__label">{theme === "day" ? "Day" : "Night"}</span>
    </button>
  );
}
