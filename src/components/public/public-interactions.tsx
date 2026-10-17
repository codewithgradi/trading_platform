"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowLeft, ArrowRight, Minus, Plus, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { initials } from "@/lib/format";

export function TestimonialCarousel({ items }: { items: { id: string; quote: string; name: string; role: string; avatarUrl?: string | null; rating: number }[] }) {
  const [index, setIndex] = useState(0);
  if (!items.length) return null;
  const item = items[index];
  const average = (items.reduce((sum, quote) => sum + quote.rating, 0) / items.length).toFixed(1);
  return <div className="testimonial-wrap"><div className="quote-mark" aria-hidden="true">“</div><AnimatePresence mode="wait"><motion.div key={item.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .26 }} className="testimonial-content"><p className="testimonial-quote">{item.quote}</p><div className="testimonial-person"><span className="testimonial-avatar" style={item.avatarUrl ? { backgroundImage: `url(${item.avatarUrl})` } : undefined}>{item.avatarUrl ? null : initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.role}</small></span></div><div className="stars" aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} fill={i < item.rating ? "currentColor" : "none"} strokeWidth={1.8} />)}</div></motion.div></AnimatePresence><div className="testimonial-controls"><button type="button" className="round-arrow" onClick={() => setIndex((index - 1 + items.length) % items.length)} aria-label="Previous testimonial"><ArrowLeft size={18} /></button><div className="testimonial-dots">{items.map((quote, i) => <button key={quote.id} type="button" className={i === index ? "active" : ""} onClick={() => setIndex(i)} aria-label={`Show testimonial ${i + 1}`} aria-current={i === index ? "true" : undefined} />)}</div><button type="button" className="round-arrow" onClick={() => setIndex((index + 1) % items.length)} aria-label="Next testimonial"><ArrowRight size={18} /></button></div><p className="rating-summary"><Star size={13} fill="currentColor" /> {average} average rating from client stories</p></div>;
}

export function FaqAccordion({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return <Accordion.Root type="single" collapsible className="faq-list">{items.map((item) => <Accordion.Item value={item.id} key={item.id} className="faq-item"><Accordion.Header><Accordion.Trigger className="faq-trigger"><span>{item.question}</span><span className="faq-plus"><Plus className="plus-icon" size={19} /><Minus className="minus-icon" size={19} /></span></Accordion.Trigger></Accordion.Header><Accordion.Content className="faq-content"><div>{item.answer}</div></Accordion.Content></Accordion.Item>)}</Accordion.Root>;
}
