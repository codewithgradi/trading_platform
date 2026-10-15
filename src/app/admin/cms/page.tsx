import type { Metadata } from "next";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { cmsVersions } from "@/db/schema";
import { CmsStudio } from "@/components/features/cms-studio";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";
import { getCmsBundle } from "@/lib/cms";

export const metadata: Metadata = { title: "Content studio" };
export const dynamic = "force-dynamic";

type Row = Record<string, string | number | boolean | null>;

function serialise<T extends Record<string, unknown>>(rows: T[]): Row[] {
  return rows.map((row) => {
    const output: Row = {};
    for (const [key, value] of Object.entries(row)) {
      output[key] =
        value instanceof Date
          ? value.toISOString()
          : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
            ? value
            : value === null || value === undefined
              ? null
              : String(value);
    }
    return output;
  });
}

export default async function AdminCmsPage() {
  await requireRole("admin");

  const [draft, published, versions] = await Promise.all([
    getCmsBundle("draft"),
    getCmsBundle("published"),
    db.select().from(cmsVersions).orderBy(desc(cmsVersions.createdAt)).limit(10),
  ]);

  return (
    <>
      <PageHeader
        title="Content studio"
        description="Edit the public website, preview it, then publish. Nothing goes live until you say so."
      />
      <CmsStudio
        lastPublished={published.settings?.updatedAt?.toISOString() ?? null}
        versions={versions.map((version) => ({
          id: version.id,
          label: version.label,
          createdAt: version.createdAt.toISOString(),
        }))}
        draft={{
          settings: draft.settings ? serialise([draft.settings])[0] : null,
          hero: draft.hero ? serialise([draft.hero])[0] : null,
          about: draft.about ? serialise([draft.about])[0] : null,
          features: serialise(draft.features),
          steps: serialise(draft.steps),
          faqs: serialise(draft.faqs),
          testimonials: serialise(draft.allTestimonials),
          team: serialise(draft.team),
          legal: serialise(draft.legal),
        }}
      />
    </>
  );
}
