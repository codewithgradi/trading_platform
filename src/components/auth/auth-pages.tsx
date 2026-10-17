"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, ArrowUpRight, Eye, EyeOff, LockKeyhole, LoaderCircle, Mail } from "lucide-react";
import { loginSchema } from "@/lib/validators";
import { useToast } from "@/components/ui/toast";
import type { z } from "zod";

function AuthBackdrop() {
  return <aside className="auth-visual"><Image src="/images/hero-city.jpg" fill priority sizes="(max-width: 900px) 0vw, 50vw" alt="Cape Town skyline at dusk" /><div className="auth-visual-shade" /><Link className="auth-brand" href="/"><span className="brand-mark"><span className="brand-glyph">N<span className="brand-dot">.</span></span></span><span className="brand-name">Northline</span></Link><div className="auth-visual-copy"><span className="eyebrow light"><span className="eyebrow-line" />YOUR SPACE, YOUR PERSPECTIVE</span><h2>A clearer view starts here.</h2><p>Your capital. Your conversations. Your next steps. All in one considered space.</p></div><span className="auth-visual-foot">NORTHLINE / CAPE TOWN, SOUTH AFRICA</span></aside>;
}
export function AuthLayout({ children }: { children: React.ReactNode }) { return <main className="auth-layout"><AuthBackdrop /><section className="auth-main"><div className="auth-mobile-brand"><Link href="/" className="brand"><span className="brand-mark"><span className="brand-glyph">N<span className="brand-dot">.</span></span></span><span className="brand-name">Northline</span></Link></div><div className="auth-inner">{children}</div><div className="auth-footer"><span>© {new Date().getFullYear()} Northline</span><Link href="/legal/privacy">Privacy &amp; security <ArrowUpRight size={13} /></Link></div></section></main>; }

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  async function signIn(email: string, password: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      toast("Welcome back. Your workspace is ready.");
      const destination = next?.startsWith(`/${result.role}`) ? next : `/${result.role}`;
      router.push(destination);
      router.refresh();
    } catch (error) { toast(error instanceof Error ? error.message : "Unable to sign in.", "error"); }
    finally { setBusy(false); }
  }
  return <><Link className="auth-back" href="/"><ArrowLeft size={16} /> Back to site</Link><div className="auth-heading"><span className="eyebrow"><span className="eyebrow-line" />SECURE ACCESS</span><h1>Welcome back<span>.</span></h1><p>Sign in to stay close to what matters.</p></div><form className="auth-form" onSubmit={handleSubmit((values) => signIn(values.email, values.password))} noValidate><div className="field"><label htmlFor="login-email">Email address</label><div className="input-with-icon"><Mail size={17} /><input id="login-email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} /></div><small className="field-error">{errors.email?.message}</small></div><div className="field"><div className="field-label-row"><label htmlFor="login-password">Password</label><Link href="/forgot-password">Forgot password?</Link></div><div className="input-with-icon"><LockKeyhole size={17} /><input id="login-password" type={visible ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small className="field-error">{errors.password?.message}</small></div><button className="button auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : null} Sign in to your portal <ArrowRight size={17} /></button></form><div className="auth-demo"><div className="auth-demo-head"><span>EXPLORE THE DEMO</span><span className="demo-line" /></div><p>Take a look from each perspective with a demo account.</p><div className="demo-roles">{[{ label: "Admin", email: "admin@northline.co.za" }, { label: "Trader", email: "thabo@northline.co.za" }, { label: "Client", email: "nomsa@northline.co.za" }].map((demo) => <button key={demo.label} type="button" disabled={busy} onClick={() => { setValue("email", demo.email); setValue("password", "Northline2026!"); void signIn(demo.email, "Northline2026!"); }}>{demo.label}<ArrowUpRight size={15} /></button>)}</div></div><p className="auth-help">Need access? <Link href="/#contact">Get in touch with our team.</Link></p></>;
}

export function RecoveryForm({ mode }: { mode: "forgot" | "reset" }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "forgot" ? { email: value } : { password: value }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setDone(true); toast(mode === "forgot" ? result.message : "Password updated. You can sign in now."); }
    catch (error) { toast(error instanceof Error ? error.message : "Something went wrong.", "error"); }
    finally { setBusy(false); }
  }
  return <><Link className="auth-back" href="/login"><ArrowLeft size={16} /> Back to sign in</Link><div className="auth-heading"><span className="eyebrow"><span className="eyebrow-line" />ACCOUNT SECURITY</span><h1>{mode === "forgot" ? "Reset your password." : "Choose a new password."}</h1><p>{mode === "forgot" ? "Enter the email connected to your account. We will send you a secure reset link." : "Use a strong, unique password of at least eight characters."}</p></div>{done ? <div className="auth-done"><span className="success-circle"><Mail size={22} /></span><h3>{mode === "forgot" ? "Check your inbox." : "All set."}</h3><p>{mode === "forgot" ? "If we found an account for that address, reset instructions are on their way." : "Your password has been updated."}</p><Link className="button" href="/login">Back to sign in <ArrowRight size={16} /></Link></div> : <form onSubmit={submit} className="auth-form"><div className="field"><label htmlFor="recovery-value">{mode === "forgot" ? "Email address" : "New password"}</label><div className="input-with-icon">{mode === "forgot" ? <Mail size={17} /> : <LockKeyhole size={17} />}<input id="recovery-value" type={mode === "forgot" ? "email" : "password"} required minLength={mode === "reset" ? 8 : undefined} value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "forgot" ? "you@example.com" : "At least eight characters"} /></div></div><button type="submit" className="button auth-submit" disabled={busy}>{busy && <LoaderCircle size={17} className="spin" />}{mode === "forgot" ? "Send reset instructions" : "Update password"}<ArrowRight size={16} /></button></form>}</>;
}
