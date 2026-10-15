"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

import { submitContactAction } from "@/app/actions/public";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContactAction, idleState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast({ title: "Message not sent", description: state.message, tone: "error" });
    }
  }, [state, toast]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
        <CheckCircle2 className="h-6 w-6 text-[var(--positive)]" strokeWidth={1.8} />
        <p className="text-[15px] font-semibold text-ink">Message received</p>
        <p className="text-[14px] leading-relaxed text-ink-2">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={state.errors?.name} htmlFor="contact-name">
          <Input id="contact-name" name="name" autoComplete="name" required placeholder="Alex Morgan" />
        </Field>
        <Field label="Email" error={state.errors?.email} htmlFor="contact-email">
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="alex@company.com"
          />
        </Field>
      </div>
      <Field label="Company (optional)" error={state.errors?.company} htmlFor="contact-company">
        <Input id="contact-company" name="company" placeholder="Morgan Holdings" />
      </Field>
      <Field
        label="How can we help?"
        error={state.errors?.message}
        htmlFor="contact-message"
        hint="Tell us about your objectives, timeline and the capital you're considering."
      >
        <Textarea
          id="contact-message"
          name="message"
          required
          placeholder="We're looking to allocate a portion of our treasury to a managed strategy…"
        />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
        Send message
      </Button>
      <p className="text-[12px] leading-relaxed text-ink-3">
        By submitting this form you agree to be contacted about Meridian&apos;s managed trading services. We
        never share your details with third parties.
      </p>
    </form>
  );
}
