"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  aboutContent,
  cmsVersions,
  faqs,
  features,
  heroContent,
  legalPages,
  siteSettings,
  steps,
  teamMembers,
  testimonials,
} from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { recordAudit } from "@/lib/ledger";
import { sanitizeHtml } from "@/lib/utils";

const CMS_TABLES = [
  "site_settings",
  "hero_content",
  "about_content",
  "features",
  "steps",
  "faqs",
  "testimonials",
  "team_members",
  "legal_pages",
] as const;

const COLUMNS: Record<(typeof CMS_TABLES)[number], string> = {
  site_settings:
    "company_name, wordmark, tagline, email, phone, address_line, linkedin_url, x_url, seo_title, seo_description, risk_disclosure, updated_by",
  hero_content:
    "eyebrow, headline, subheadline, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, stat_label_one, stat_value_one, stat_label_two, stat_value_two, stat_label_three, stat_value_three, updated_by",
  about_content:
    "heading, story, mission, figure_label_one, figure_value_one, figure_label_two, figure_value_two, figure_label_three, figure_value_three, updated_by",
  features: "icon, title, body, sort_order, updated_by",
  steps: "title, body, sort_order, updated_by",
  faqs: "question, answer, sort_order, updated_by",
  testimonials: "quote, author, author_role, rating, visible, approved, sort_order, updated_by",
  team_members: "name, role, initials, bio, sort_order, updated_by",
  legal_pages: "slug, title, body, sort_order, updated_by",
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidatePublic() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/legal/[slug]", "page");
}

/* ------------------------------ Singletons ------------------------------ */

export async function saveSiteSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("admin");
  const values = {
    companyName: text(formData, "companyName"),
    wordmark: text(formData, "wordmark"),
    tagline: text(formData, "tagline"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    addressLine: text(formData, "addressLine"),
    linkedinUrl: text(formData, "linkedinUrl"),
    xUrl: text(formData, "xUrl"),
    seoTitle: text(formData, "seoTitle"),
    seoDescription: text(formData, "seoDescription"),
    riskDisclosure: text(formData, "riskDisclosure"),
    updatedBy: user.id,
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.status, "draft")).limit(1);
  if (existing) await db.update(siteSettings).set(values).where(eq(siteSettings.id, existing.id));
  else await db.insert(siteSettings).values({ ...values, status: "draft" });

  await recordAudit({ actor: user, action: "cms.save", entity: "site_settings", after: values });
  revalidatePath("/admin/cms/settings");
  return ok("Site settings saved to draft.");
}

export async function saveHeroAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("admin");
  const values = {
    eyebrow: text(formData, "eyebrow"),
    headline: text(formData, "headline"),
    subheadline: text(formData, "subheadline"),
    primaryCtaLabel: text(formData, "primaryCtaLabel"),
    primaryCtaHref: text(formData, "primaryCtaHref"),
    secondaryCtaLabel: text(formData, "secondaryCtaLabel"),
    secondaryCtaHref: text(formData, "secondaryCtaHref"),
    statLabelOne: text(formData, "statLabelOne"),
    statValueOne: text(formData, "statValueOne"),
    statLabelTwo: text(formData, "statLabelTwo"),
    statValueTwo: text(formData, "statValueTwo"),
    statLabelThree: text(formData, "statLabelThree"),
    statValueThree: text(formData, "statValueThree"),
    updatedBy: user.id,
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(heroContent).where(eq(heroContent.status, "draft")).limit(1);
  if (existing) await db.update(heroContent).set(values).where(eq(heroContent.id, existing.id));
  else await db.insert(heroContent).values({ ...values, status: "draft" });

  await recordAudit({ actor: user, action: "cms.save", entity: "hero_content", after: values });
  revalidatePath("/admin/cms/hero");
  return ok("Hero saved to draft.");
}

export async function saveAboutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("admin");
  const values = {
    heading: text(formData, "heading"),
    story: text(formData, "story"),
    mission: text(formData, "mission"),
    figureLabelOne: text(formData, "figureLabelOne"),
    figureValueOne: text(formData, "figureValueOne"),
    figureLabelTwo: text(formData, "figureLabelTwo"),
    figureValueTwo: text(formData, "figureValueTwo"),
    figureLabelThree: text(formData, "figureLabelThree"),
    figureValueThree: text(formData, "figureValueThree"),
    updatedBy: user.id,
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(aboutContent).where(eq(aboutContent.status, "draft")).limit(1);
  if (existing) await db.update(aboutContent).set(values).where(eq(aboutContent.id, existing.id));
  else await db.insert(aboutContent).values({ ...values, status: "draft" });

  await recordAudit({ actor: user, action: "cms.save", entity: "about_content", after: values });
  revalidatePath("/admin/cms/about");
  return ok("About section saved to draft.");
}

/* -------------------------------- Lists --------------------------------- */

export type CmsListKind = "features" | "steps" | "faqs" | "testimonials" | "team" | "legal";

export async function saveListItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("admin");
  const kind = String(formData.get("kind") ?? "") as CmsListKind;
  const id = String(formData.get("id") ?? "");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const base = { sortOrder, updatedBy: user.id, updatedAt: new Date(), status: "draft" as const };

  switch (kind) {
    case "features": {
      const values = { ...base, icon: text(formData, "icon") || "ShieldCheck", title: text(formData, "title"), body: text(formData, "body") };
      if (!values.title || !values.body) return fail("Title and body are required.");
      if (id) await db.update(features).set(values).where(eq(features.id, id));
      else await db.insert(features).values(values);
      break;
    }
    case "steps": {
      const values = { ...base, title: text(formData, "title"), body: text(formData, "body") };
      if (!values.title || !values.body) return fail("Title and body are required.");
      if (id) await db.update(steps).set(values).where(eq(steps.id, id));
      else await db.insert(steps).values(values);
      break;
    }
    case "faqs": {
      const values = { ...base, question: text(formData, "question"), answer: text(formData, "answer") };
      if (!values.question || !values.answer) return fail("Question and answer are required.");
      if (id) await db.update(faqs).set(values).where(eq(faqs.id, id));
      else await db.insert(faqs).values(values);
      break;
    }
    case "testimonials": {
      const values = {
        ...base,
        quote: text(formData, "quote"),
        author: text(formData, "author"),
        authorRole: text(formData, "authorRole"),
        rating: Math.min(5, Math.max(1, Number(formData.get("rating") ?? 5))),
        visible: formData.get("visible") === "on",
        approved: formData.get("approved") === "on",
      };
      if (!values.quote || !values.author) return fail("Quote and author are required.");
      if (id) await db.update(testimonials).set(values).where(eq(testimonials.id, id));
      else await db.insert(testimonials).values(values);
      break;
    }
    case "team": {
      const values = {
        ...base,
        name: text(formData, "name"),
        role: text(formData, "role"),
        initials: text(formData, "initials"),
        bio: text(formData, "bio"),
      };
      if (!values.name || !values.role) return fail("Name and role are required.");
      if (id) await db.update(teamMembers).set(values).where(eq(teamMembers.id, id));
      else await db.insert(teamMembers).values(values);
      break;
    }
    case "legal": {
      const values = {
        ...base,
        slug: text(formData, "slug"),
        title: text(formData, "title"),
        body: sanitizeHtml(String(formData.get("body") ?? "")),
      };
      if (!values.slug || !values.title) return fail("Slug and title are required.");
      if (id) await db.update(legalPages).set(values).where(eq(legalPages.id, id));
      else await db.insert(legalPages).values(values);
      break;
    }
    default:
      return fail("Unknown content type.");
  }

  await recordAudit({ actor: user, action: id ? "cms.update" : "cms.create", entity: kind, entityId: id || null });
  revalidatePath(`/admin/cms/${kind}`);
  return ok(id ? "Item updated in draft." : "Item added to draft.");
}

export async function deleteListItemAction(kind: CmsListKind, id: string): Promise<ActionState> {
  const user = await assertRole("admin");
  const tables = {
    features,
    steps,
    faqs,
    testimonials,
    team: teamMembers,
    legal: legalPages,
  };
  const table = tables[kind];
  if (!table) return fail("Unknown content type.");

  if (kind === "features") await db.delete(features).where(eq(features.id, id));
  if (kind === "steps") await db.delete(steps).where(eq(steps.id, id));
  if (kind === "faqs") await db.delete(faqs).where(eq(faqs.id, id));
  if (kind === "testimonials") await db.delete(testimonials).where(eq(testimonials.id, id));
  if (kind === "team") await db.delete(teamMembers).where(eq(teamMembers.id, id));
  if (kind === "legal") await db.delete(legalPages).where(eq(legalPages.id, id));

  await recordAudit({ actor: user, action: "cms.delete", entity: kind, entityId: id });
  revalidatePath(`/admin/cms/${kind}`);
  return ok("Item deleted from draft.");
}

export async function reorderListAction(kind: CmsListKind, orderedIds: string[]): Promise<ActionState> {
  await assertRole("admin");
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    if (kind === "features") await db.update(features).set({ sortOrder: index }).where(eq(features.id, id));
    if (kind === "steps") await db.update(steps).set({ sortOrder: index }).where(eq(steps.id, id));
    if (kind === "faqs") await db.update(faqs).set({ sortOrder: index }).where(eq(faqs.id, id));
    if (kind === "testimonials")
      await db.update(testimonials).set({ sortOrder: index }).where(eq(testimonials.id, id));
    if (kind === "team") await db.update(teamMembers).set({ sortOrder: index }).where(eq(teamMembers.id, id));
    if (kind === "legal") await db.update(legalPages).set({ sortOrder: index }).where(eq(legalPages.id, id));
  }
  revalidatePath(`/admin/cms/${kind}`);
  return ok("Order updated.");
}

/* ------------------------ Publish / version history ---------------------- */

async function snapshotDrafts(): Promise<Record<string, unknown>> {
  const snapshot: Record<string, unknown> = {};
  for (const table of CMS_TABLES) {
    const result = await db.execute<{ rows: unknown }>(
      sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as rows from ${sql.identifier(table)} t where t.status = 'draft'`,
    );
    snapshot[table] = result.rows[0]?.rows ?? [];
  }
  return snapshot;
}

export async function publishCmsAction(label?: string): Promise<ActionState> {
  const user = await assertRole("admin");

  const snapshot = await snapshotDrafts();

  for (const table of CMS_TABLES) {
    const columns = COLUMNS[table];
    await db.execute(sql`delete from ${sql.identifier(table)} where status = 'published'`);
    await db.execute(
      sql.raw(
        `insert into ${table} (status, ${columns}, updated_at) select 'published', ${columns}, now() from ${table} where status = 'draft'`,
      ),
    );
  }

  await db.insert(cmsVersions).values({
    label: label?.trim() || `Published ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    snapshot,
    createdBy: user.id,
  });

  await recordAudit({ actor: user, action: "cms.publish", entity: "cms", entityId: "site" });
  revalidatePublic();
  return ok("Changes are live on the public site.");
}

export async function restoreCmsVersionAction(versionId: string): Promise<ActionState> {
  const user = await assertRole("admin");
  const [version] = await db.select().from(cmsVersions).where(eq(cmsVersions.id, versionId)).limit(1);
  if (!version) return fail("That version no longer exists.");

  const snapshot = version.snapshot as Record<string, unknown[]>;
  for (const table of CMS_TABLES) {
    const rows = snapshot[table] ?? [];
    await db.execute(sql`delete from ${sql.identifier(table)} where status = 'draft'`);
    if (Array.isArray(rows) && rows.length) {
      await db.execute(
        sql`insert into ${sql.identifier(table)} select * from jsonb_populate_recordset(null::${sql.identifier(table)}, ${JSON.stringify(rows)}::jsonb)`,
      );
    }
  }

  await recordAudit({ actor: user, action: "cms.restore", entity: "cms", entityId: versionId });
  revalidatePath("/admin/cms");
  return ok("Draft restored from version history. Review it, then publish.");
}
