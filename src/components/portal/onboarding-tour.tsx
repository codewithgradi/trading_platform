"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions";
import type { Role } from "@/lib/types";

const guide = {
  admin: [
    { target: "nav-overview", title: "The whole picture.", body: "Start with a live view of balances, clients, traders and activity across Northline." },
    { target: "nav-users", title: "Your people, organised.", body: "Create accounts, assign clients to traders and manage access from one place." },
    { target: "nav-cms", title: "Make the site yours.", body: "Edit public content as a draft, preview it, then publish when it is ready." },
    { target: "nav-analytics", title: "See beyond the numbers.", body: "Explore trends, activity and performance across your platform." },
    { target: "nav-audit", title: "Every action accounted for.", body: "The audit trail keeps a clear history of sensitive changes." },
  ],
  trader: [
    { target: "nav-overview", title: "Your desk at a glance.", body: "See your clients, assets, recent activity and the items that need your attention." },
    { target: "nav-customers", title: "Know every account.", body: "Open a customer's profile to review their balance, ledger and messages." },
    { target: "nav-trades", title: "Record with care.", body: "Log trades and preview allocations before an outcome reaches client accounts." },
    { target: "nav-withdrawals", title: "A clear approval path.", body: "Review, approve or reject requests before processing a withdrawal." },
    { target: "nav-feedback", title: "Keep the conversation going.", body: "Respond to questions and resolve concerns from your inbox." },
    { target: "nav-analytics", title: "Track your impact.", body: "Understand performance and daily activity in the analytics view." },
  ],
  client: [
    { target: "nav-overview", title: "Welcome to your view.", body: "Your balance, performance and dedicated trader are all here at a glance." },
    { target: "nav-transactions", title: "Every movement, visible.", body: "Explore your complete transaction history and export a record at any time." },
    { target: "notifications", title: "Stay in the loop.", body: "Important balance changes and updates arrive here as they happen." },
    { target: "nav-withdrawals", title: "Withdraw with clarity.", body: "Request a withdrawal and follow its status from review to completion." },
    { target: "nav-feedback", title: "Talk to us directly.", body: "Send a question or concern and follow the conversation in one place." },
    { target: "profile", title: "Make it yours.", body: "Keep your details, preferences and account security up to date." },
  ],
};
export function OnboardingTour({ role, completed }: { role: Role; completed: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const router = useRouter();
  const steps = guide[role];
  const measure = useCallback(() => { const target = document.querySelector(`[data-tour="${steps[step].target}"]`); const bounds = target?.getBoundingClientRect(); setRect(bounds && bounds.width && bounds.height ? bounds : null); }, [step, steps]);
  useEffect(() => { if (!completed) { const timer = setTimeout(() => setOpen(true), 850); return () => clearTimeout(timer); } }, [completed]);
  useEffect(() => { const replay = () => { setStep(0); setOpen(true); }; window.addEventListener("replay-tour", replay); return () => window.removeEventListener("replay-tour", replay); }, []);
  useEffect(() => { if (!open) return; measure(); window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true); return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); }; }, [open, measure]);
  async function finish() { setOpen(false); await completeOnboarding(); router.refresh(); }
  return <AnimatePresence>{open && <><div className="tour-dismiss-layer" onClick={finish} aria-hidden="true" />{rect && <motion.div className="tour-spotlight" animate={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} transition={{ duration: .25 }} aria-hidden="true" />}<motion.div className="tour-card" role="dialog" aria-modal="true" aria-label="Portal guide" initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: .97 }} transition={{ duration: .25 }}><div className="tour-card-top"><span>YOUR NORTHLINE GUIDE</span><button type="button" aria-label="Skip guide" onClick={finish}><X size={17} /></button></div><div className="tour-count">{String(step + 1).padStart(2, "0")} <span>/ {String(steps.length).padStart(2, "0")}</span></div><AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .2 }}><h3>{steps[step].title}</h3><p>{steps[step].body}</p></motion.div></AnimatePresence><div className="tour-dots">{steps.map((_, index) => <span key={index} className={index === step ? "active" : ""} />)}</div><div className="tour-actions"><button type="button" className="tour-back" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={15} /> Back</button><button type="button" className="button" onClick={() => step === steps.length - 1 ? void finish() : setStep(step + 1)}>{step === steps.length - 1 ? "Finish guide" : "Next step"}<ArrowRight size={15} /></button></div></motion.div></>}</AnimatePresence>;
}
