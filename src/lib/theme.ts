"use client";

import { useEffect, useState } from "react";

export type ThemePref = "system" | "dark" | "light";
const KEY = "mycelium-theme";

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

export function resolveTheme(pref: ThemePref): "dark" | "light" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {}
  document.documentElement.setAttribute("data-theme", resolveTheme(pref));
}

export type CanvasColors = { label: string; halo: string; link: string; linkStrength: number; you: string; light: boolean };

function readColors(): CanvasColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (k: string) => cs.getPropertyValue(k).trim();
  const light = document.documentElement.getAttribute("data-theme") === "light";
  return {
    label: v("--graph-label") || "rgba(238,240,255,0.92)",
    halo: v("--graph-halo") || "rgba(9,13,34,0.9)",
    link: v("--graph-link") || "127, 214, 232",
    linkStrength: Number(v("--graph-link-strength")) || 1,
    you: light ? "#a26d0c" : "#F7D48F",
    light,
  };
}

/** Canvas colors for the current theme; updates when the theme changes. */
export function useCanvasColors(): CanvasColors {
  const [c, setC] = useState<CanvasColors>({ label: "rgba(238,240,255,0.92)", halo: "rgba(9,13,34,0.9)", link: "127, 214, 232", linkStrength: 1, you: "#F7D48F", light: false });
  useEffect(() => {
    setC(readColors());
    const mo = new MutationObserver(() => setC(readColors()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return c;
}

/** Keeps "system" in sync with the OS setting while the app is open. */
export function useSystemThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => {
      if (readThemePref() === "system") applyTheme("system");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
}
