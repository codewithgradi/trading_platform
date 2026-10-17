"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { sendContact } from "@/app/actions";
import { contactSchema } from "@/lib/validators";
import { useToast } from "@/components/ui/toast";
import type { z } from "zod";

type ContactValues = z.infer<typeof contactSchema>;
export function ContactForm() {
  const show = useToast();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", phone: "", message: "" } });
  const submit = handleSubmit(async (values) => {
    const result = await sendContact(values);
    if (result.ok) { show(result.message); setSent(true); reset(); }
    else show(result.error, "error");
  });
  if (sent) return <div className="contact-success"><span className="success-circle"><ArrowUpRight size={25} /></span><h3>Message received.</h3><p>Thank you for reaching out. Someone from our team will be in touch soon.</p><button type="button" className="text-link" onClick={() => setSent(false)}>Send another message <ArrowUpRight size={15} /></button></div>;
  return <form className="contact-form" onSubmit={submit} noValidate><div className="form-two"><div className="field"><label htmlFor="contact-name">Full name <span>*</span></label><input id="contact-name" placeholder="Your name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} /><small className="field-error">{errors.name?.message}</small></div><div className="field"><label htmlFor="contact-email">Email address <span>*</span></label><input id="contact-email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} /><small className="field-error">{errors.email?.message}</small></div></div><div className="field"><label htmlFor="contact-phone">Phone number <em>optional</em></label><input id="contact-phone" type="tel" placeholder="Your contact number" autoComplete="tel" {...register("phone")} /></div><div className="field"><label htmlFor="contact-message">How can we help? <span>*</span></label><textarea id="contact-message" rows={5} placeholder="Tell us what you would like to know..." {...register("message")} aria-invalid={!!errors.message} /><small className="field-error">{errors.message?.message}</small></div><button type="submit" className="button contact-submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle size={16} className="spin" /> : null} Send message <ArrowUpRight size={16} /></button><p className="form-privacy">We will only use your details to respond to your enquiry.</p></form>;
}
