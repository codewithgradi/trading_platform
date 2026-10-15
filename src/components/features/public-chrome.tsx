"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#what-we-do", label: "About" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#performance", label: "Performance" },
  { href: "/#testimonials", label: "Testimonials" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export function PublicHeader({ wordmark, signedIn }: { wordmark: string; signedIn: string | null }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled ? "border-line bg-bg/80 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${wordmark} home`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-inverse text-[13px] font-bold text-on-inverse">
            {wordmark.charAt(0)}
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">{wordmark}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href={signedIn} className="hidden sm:block">
              <Button size="sm">Open portal</Button>
            </Link>
          ) : (
            <Link href="/login" className="hidden sm:block">
              <Button size="sm">Log in</Button>
            </Link>
          )}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden"
          >
            <Menu className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <span className="text-[15px] font-semibold tracking-tight text-ink">{wordmark}</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <motion.nav
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="flex flex-col px-5 pt-4"
            >
              {NAV.map((item) => (
                <motion.div
                  key={item.href}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-line py-4 text-[20px] font-semibold tracking-tight text-ink"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-8">
                <Link href={signedIn ?? "/login"} onClick={() => setOpen(false)}>
                  <Button size="lg" className="w-full">
                    {signedIn ? "Open portal" : "Log in"}
                  </Button>
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export function FaqAccordion({ items }: { items: { id: string; question: string; answer: string }[] }) {
  const [openId, setOpenId] = React.useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-[var(--border)] border-y border-line">
      {items.map((item) => {
        const expanded = openId === item.id;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenId(expanded ? null : item.id)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-[15px] font-semibold tracking-tight text-ink sm:text-[16px]">
                  {item.question}
                </span>
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <span className="absolute h-[1.5px] w-3.5 rounded-full bg-ink" />
                  <motion.span
                    animate={{ rotate: expanded ? 0 : 90, opacity: expanded ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute h-[1.5px] w-3.5 rounded-full bg-ink"
                  />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl pb-6 text-[14.5px] leading-relaxed text-ink-2">{item.answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
