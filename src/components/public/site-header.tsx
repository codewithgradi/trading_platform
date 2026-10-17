"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { label: "Home", href: "/#home" }, { label: "About", href: "/#about" }, { label: "How it works", href: "/#how-it-works" }, { label: "Performance", href: "/#performance" }, { label: "Testimonials", href: "/#testimonials" }, { label: "FAQ", href: "/#faq" }, { label: "Contact", href: "/#contact" },
];
export function Brand({ inverse = false, name = "Northline", logoUrl }: { inverse?: boolean; name?: string; logoUrl?: string }) {
  return <Link href="/" className={`brand ${inverse ? "brand-inverse" : ""}`} aria-label={`${name} home`}><span className="brand-mark" aria-hidden="true">{logoUrl ? <span className="brand-custom-logo" style={{ backgroundImage: `url(${logoUrl})` }} /> : <span className="brand-glyph">N<span className="brand-dot">.</span></span>}</span><span className="brand-name">{name}</span></Link>;
}
export function SiteHeader({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { const listener = () => setScrolled(window.scrollY > 40); listener(); window.addEventListener("scroll", listener, { passive: true }); return () => window.removeEventListener("scroll", listener); }, []);
  const overHero = pathname === "/" && !scrolled;
  return <header className={`site-header ${overHero ? "site-header-hero" : "site-header-solid"}`}><div className="site-header-inner"><Brand name={name} logoUrl={logoUrl} /><nav className="desktop-nav" aria-label="Main navigation">{links.map((link) => <Link key={link.label} href={link.href}>{link.label}</Link>)}</nav><div className="site-header-actions"><ThemeToggle onHero={overHero} /><Link className="button button-small header-login" href="/login">Log in <ArrowUpRight size={14} /></Link><Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button className="mobile-menu-trigger" aria-label="Open menu"><Menu size={24} /></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="drawer-overlay" /><Dialog.Content className="mobile-drawer"><Dialog.Title className="sr-only">Navigation</Dialog.Title><div className="drawer-head"><Brand name={name} logoUrl={logoUrl} /><Dialog.Close className="icon-button" aria-label="Close menu"><X size={22} /></Dialog.Close></div><nav className="drawer-links" aria-label="Mobile navigation">{links.map((link, index) => <Link key={link.label} href={link.href} onClick={() => setOpen(false)}><span className="drawer-index">0{index + 1}</span>{link.label}<ArrowUpRight size={18} /></Link>)}</nav><div className="drawer-bottom"><ThemeToggle /><Link href="/login" onClick={() => setOpen(false)} className="button">Log in <ArrowUpRight size={16} /></Link></div></Dialog.Content></Dialog.Portal></Dialog.Root></div></div></header>;
}
