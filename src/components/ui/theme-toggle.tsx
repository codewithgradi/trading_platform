"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  onPersist,
}: {
  className?: string;
  onPersist?: (theme: string) => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        onPersist?.(next);
      }}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface",
        className,
      )}
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center"
      >
        {isDark ? <Moon className="h-4 w-4" strokeWidth={1.8} /> : <Sun className="h-4 w-4" strokeWidth={1.8} />}
      </motion.span>
    </button>
  );
}
