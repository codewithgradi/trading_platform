"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { updateThemePreference } from "@/app/theme-action";

export function ThemeToggle({
  onHero = false,
  loggedIn = false,
}: {
  onHero?: boolean;
  loggedIn?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const toggle = () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    if (loggedIn) void updateThemePreference(next);
  };
  return (
    <button
      type="button"
      className={`theme-toggle ${onHero ? "theme-toggle-hero" : ""}`}
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ rotate: -70, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 70, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          className="theme-toggle-icon"
        >
          {dark ? (
            <Moon size={18} strokeWidth={1.8} />
          ) : (
            <Sun size={18} strokeWidth={1.8} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
