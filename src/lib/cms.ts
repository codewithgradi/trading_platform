import { asc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import {
  aboutContent,
  faqs,
  features,
  heroContent,
  legalPages,
  siteSettings,
  steps,
  teamMembers,
  testimonials,
} from "@/db/schema";

export type CmsStatus = "draft" | "published";

export const getCmsBundle = cache(async (status: CmsStatus = "published") => {
  const [settings, hero, about, featureRows, stepRows, faqRows, testimonialRows, teamRows, legalRows] =
    await Promise.all([
      db.select().from(siteSettings).where(eq(siteSettings.status, status)).limit(1),
      db.select().from(heroContent).where(eq(heroContent.status, status)).limit(1),
      db.select().from(aboutContent).where(eq(aboutContent.status, status)).limit(1),
      db.select().from(features).where(eq(features.status, status)).orderBy(asc(features.sortOrder)),
      db.select().from(steps).where(eq(steps.status, status)).orderBy(asc(steps.sortOrder)),
      db.select().from(faqs).where(eq(faqs.status, status)).orderBy(asc(faqs.sortOrder)),
      db
        .select()
        .from(testimonials)
        .where(eq(testimonials.status, status))
        .orderBy(asc(testimonials.sortOrder)),
      db.select().from(teamMembers).where(eq(teamMembers.status, status)).orderBy(asc(teamMembers.sortOrder)),
      db.select().from(legalPages).where(eq(legalPages.status, status)).orderBy(asc(legalPages.sortOrder)),
    ]);

  const visibleTestimonials = testimonialRows.filter((row) => row.visible && row.approved);
  const averageRating = visibleTestimonials.length
    ? visibleTestimonials.reduce((sum, row) => sum + row.rating, 0) / visibleTestimonials.length
    : 0;

  return {
    settings: settings[0] ?? null,
    hero: hero[0] ?? null,
    about: about[0] ?? null,
    features: featureRows,
    steps: stepRows,
    faqs: faqRows,
    testimonials: visibleTestimonials,
    allTestimonials: testimonialRows,
    team: teamRows,
    legal: legalRows,
    averageRating,
  };
});

export type CmsBundle = Awaited<ReturnType<typeof getCmsBundle>>;
