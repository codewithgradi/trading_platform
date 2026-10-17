import type { Metadata } from "next";
import { LandingPage } from "@/components/public/landing";
import { getPublicContent } from "@/lib/queries";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getPublicContent();
  return {
    title: { absolute: content.site.seoTitle },
    description: content.site.seoDescription,
    openGraph: {
      title: content.site.seoTitle,
      description: content.site.seoDescription,
    },
  };
}
export default async function HomePage() {
  const { content, faqs, testimonials, team } = await getPublicContent();
  return (
    <LandingPage
      content={content}
      faqs={faqs}
      testimonials={testimonials}
      team={team}
    />
  );
}
