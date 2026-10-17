import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { PublicFooter } from "@/components/public/landing";
import { getPublicContent } from "@/lib/queries";

const keys = { terms: "legal_terms", privacy: "legal_privacy", risk: "legal_risk" } as const;
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { content } = await getPublicContent();
  const key = keys[slug as keyof typeof keys];
  return { title: key ? content[key].title : "Page not found" };
}
export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = keys[slug as keyof typeof keys];
  if (!key) notFound();
  const { content } = await getPublicContent();
  return <><SiteHeader name={content.site.name} logoUrl={content.site.logoUrl} /><main className="legal-page"><div className="container legal-inner"><Link className="back-link" href="/"><ArrowLeft size={16} /> Back to home</Link><span className="eyebrow"><span className="eyebrow-line" />NORTHLINE / LEGAL</span><h1>{content[key].title}</h1><div className="legal-body">{content[key].body.split("\n").filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div><p className="legal-help">Have a question? <Link href="/#contact">Get in touch with our team.</Link></p></div></main><PublicFooter content={content} /></>;
}
