"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ArrowRight, LoaderCircle, X } from "lucide-react";
import type { ActionResult } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

export function ConfirmDialog({ trigger, title, description, summary, word, actionLabel, destructive = false, onConfirm }: { trigger: ReactNode; title: string; description: string; summary?: ReactNode; word?: string; actionLabel: string; destructive?: boolean; onConfirm: () => Promise<ActionResult> }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function confirm() {
    if (word && typed !== word) return;
    setBusy(true);
    try { const result = await onConfirm(); if (result.ok) { toast(result.message); setOpen(false); setTyped(""); } else toast(result.error, "error"); }
    catch { toast("This action could not be completed. Please try again.", "error"); }
    finally { setBusy(false); }
  }
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); if (!next) setTyped(""); } }}><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="confirm-dialog"><div className={`confirm-icon ${destructive ? "danger" : ""}`}><AlertTriangle size={21} /></div><Dialog.Title className="confirm-title">{title}</Dialog.Title><Dialog.Description className="confirm-description">{description}</Dialog.Description>{summary && <div className="confirm-summary">{summary}</div>}{word && <div className="field confirm-word"><label htmlFor="confirmation-word">Type <strong>{word}</strong> to confirm</label><input id="confirmation-word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" placeholder={word} /></div>}<div className="confirm-actions"><Dialog.Close className="button button-outline" type="button" disabled={busy}>Go back</Dialog.Close><button type="button" className={`button ${destructive ? "button-danger" : ""}`} onClick={confirm} disabled={busy || (!!word && typed !== word)}>{busy && <LoaderCircle size={15} className="spin" />}{actionLabel}<ArrowRight size={15} /></button></div><Dialog.Close className="confirm-close" aria-label="Close" disabled={busy}><X size={19} /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
