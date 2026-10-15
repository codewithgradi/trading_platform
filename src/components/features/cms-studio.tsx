"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, History, Plus, Rocket, Trash2 } from "lucide-react";

import {
  deleteListItemAction,
  publishCmsAction,
  reorderListAction,
  restoreCmsVersionAction,
  saveAboutAction,
  saveHeroAction,
  saveListItemAction,
  saveSiteSettingsAction,
  type CmsListKind,
} from "@/app/actions/cms";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { cn, formatDate } from "@/lib/utils";

type Row = Record<string, string | number | boolean | null>;

const SECTIONS = [
  { key: "settings", label: "Site settings" },
  { key: "hero", label: "Hero" },
  { key: "about", label: "About" },
  { key: "features", label: "What we do" },
  { key: "steps", label: "How it works" },
  { key: "faqs", label: "FAQs" },
  { key: "testimonials", label: "Testimonials" },
  { key: "team", label: "Team" },
  { key: "legal", label: "Legal pages" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const LIST_FIELDS: Record<CmsListKind, { name: string; label: string; type?: "text" | "textarea" | "number" | "checkbox" }[]> = {
  features: [
    { name: "title", label: "Title" },
    { name: "body", label: "Body", type: "textarea" },
    { name: "icon", label: "Icon (Lucide name)" },
  ],
  steps: [
    { name: "title", label: "Title" },
    { name: "body", label: "Body", type: "textarea" },
  ],
  faqs: [
    { name: "question", label: "Question" },
    { name: "answer", label: "Answer", type: "textarea" },
  ],
  testimonials: [
    { name: "quote", label: "Quote", type: "textarea" },
    { name: "author", label: "Author" },
    { name: "authorRole", label: "Author role" },
    { name: "rating", label: "Rating (1–5)", type: "number" },
    { name: "visible", label: "Visible on site", type: "checkbox" },
    { name: "approved", label: "Approved", type: "checkbox" },
  ],
  team: [
    { name: "name", label: "Name" },
    { name: "role", label: "Role" },
    { name: "initials", label: "Initials" },
    { name: "bio", label: "Bio", type: "textarea" },
  ],
  legal: [
    { name: "slug", label: "Slug" },
    { name: "title", label: "Title" },
    { name: "body", label: "Body (basic HTML allowed)", type: "textarea" },
  ],
};

function SingletonForm({
  action,
  fields,
  values,
  title,
  description,
}: {
  action: (prev: typeof idleState, formData: FormData) => Promise<typeof idleState>;
  fields: { name: string; label: string; type?: "text" | "textarea" }[];
  values: Row | null;
  title: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Draft saved", description: state.message, tone: "success" });
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not saved", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  return (
    <Card>
      <CardHeader title={title} description={description} />
      <form action={formAction} className="grid gap-4 p-5 sm:grid-cols-2">
        {fields.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            htmlFor={field.name}
            className={field.type === "textarea" ? "sm:col-span-2" : undefined}
          >
            {field.type === "textarea" ? (
              <Textarea id={field.name} name={field.name} defaultValue={String(values?.[field.name] ?? "")} />
            ) : (
              <Input id={field.name} name={field.name} defaultValue={String(values?.[field.name] ?? "")} />
            )}
          </Field>
        ))}
        <div className="sm:col-span-2">
          <Button type="submit" loading={pending}>
            Save draft
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ListEditor({ kind, rows }: { kind: CmsListKind; rows: Row[] }) {
  const [state, formAction, pending] = useActionState(saveListItemAction, idleState);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const fields = LIST_FIELDS[kind];

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Draft updated", description: state.message, tone: "success" });
      setEditing(null);
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not saved", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await reorderListAction(kind, next.map((row) => String(row.id)));
    router.refresh();
  };

  const renderForm = (row: Row | null) => (
    <form action={formAction} className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={row ? String(row.id) : ""} />
      <input type="hidden" name="sortOrder" value={row ? Number(row.sortOrder ?? 0) : rows.length} />
      {fields.map((field) => (
        <Field
          key={field.name}
          label={field.label}
          htmlFor={`${kind}-${field.name}-${row?.id ?? "new"}`}
          className={field.type === "textarea" ? "sm:col-span-2" : undefined}
        >
          {field.type === "textarea" ? (
            <Textarea
              id={`${kind}-${field.name}-${row?.id ?? "new"}`}
              name={field.name}
              defaultValue={String(row?.[field.name] ?? "")}
              className={kind === "legal" ? "min-h-[220px] font-mono text-[12.5px]" : undefined}
            />
          ) : field.type === "checkbox" ? (
            <label className="flex h-11 items-center gap-2 rounded-lg border border-line px-3.5">
              <input
                type="checkbox"
                name={field.name}
                defaultChecked={Boolean(row?.[field.name] ?? true)}
                className="h-4 w-4 accent-[var(--text)]"
              />
              <span className="text-[13px] text-ink-2">{field.label}</span>
            </label>
          ) : (
            <Input
              id={`${kind}-${field.name}-${row?.id ?? "new"}`}
              name={field.name}
              type={field.type === "number" ? "number" : "text"}
              defaultValue={String(row?.[field.name] ?? (field.type === "number" ? 5 : ""))}
            />
          )}
        </Field>
      ))}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" loading={pending}>
          {row ? "Save item" : "Add item"}
        </Button>
        {row ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Items" description="Reorder with the arrows. Changes stay in draft until you publish." />
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((row, index) => (
            <li key={String(row.id)}>
              <div className="flex items-start gap-3 px-5 py-3.5">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => void move(index, -1)}
                    className="rounded border border-line p-1 text-ink-3 transition-colors hover:text-ink"
                  >
                    <ArrowUp className="h-3 w-3" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => void move(index, 1)}
                    className="rounded border border-line p-1 text-ink-3 transition-colors hover:text-ink"
                  >
                    <ArrowDown className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">
                    {String(row.title ?? row.question ?? row.author ?? row.name ?? row.slug ?? "Item")}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">
                    {String(row.body ?? row.answer ?? row.quote ?? row.bio ?? "")
                      .replace(/<[^>]+>/g, " ")
                      .slice(0, 160)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(editing === String(row.id) ? null : String(row.id))}
                  >
                    {editing === String(row.id) ? "Close" : "Edit"}
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Delete item" onClick={() => setDeleting(row)}>
                    <Trash2 className="h-3.5 w-3.5 text-[var(--negative)]" strokeWidth={1.8} />
                  </Button>
                </div>
              </div>
              {editing === String(row.id) ? renderForm(row) : null}
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="px-5 py-8 text-center text-[13px] text-ink-3">No items in this section yet.</li>
          ) : null}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Add a new item" action={<Plus className="h-4 w-4 text-ink-3" strokeWidth={1.8} />} />
        {renderForm(null)}
      </Card>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="danger"
        title="Delete this content item?"
        description="It is removed from the draft immediately. The live site is unaffected until you publish."
        confirmLabel="Delete item"
        requireWord="DELETE"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteListItemAction(kind, String(deleting.id));
          toast({
            title: result.status === "success" ? "Deleted" : "Failed",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
          setDeleting(null);
          router.refresh();
        }}
      />
    </div>
  );
}

export function CmsStudio({
  draft,
  versions,
  lastPublished,
}: {
  draft: {
    settings: Row | null;
    hero: Row | null;
    about: Row | null;
    features: Row[];
    steps: Row[];
    faqs: Row[];
    testimonials: Row[];
    team: Row[];
    legal: Row[];
  };
  versions: { id: string; label: string; createdAt: string }[];
  lastPublished: string | null;
}) {
  const [section, setSection] = React.useState<SectionKey>("settings");
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [restoring, setRestoring] = React.useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-ink">Draft workspace</p>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {lastPublished ? `Last published ${formatDate(lastPublished, true)}` : "Nothing published yet"} ·
            edits are invisible to the public until you publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
              Preview live site
            </Button>
          </Link>
          <Button size="sm" onClick={() => setPublishOpen(true)}>
            <Rocket className="h-3.5 w-3.5" strokeWidth={1.8} />
            Publish changes
          </Button>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
              section === item.key
                ? "border-transparent bg-inverse text-on-inverse"
                : "border-line text-ink-2 hover:bg-surface hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === "settings" ? (
        <SingletonForm
          action={saveSiteSettingsAction}
          values={draft.settings}
          title="Site settings"
          description="Company identity, contact details, social links and SEO."
          fields={[
            { name: "companyName", label: "Company name" },
            { name: "wordmark", label: "Wordmark" },
            { name: "tagline", label: "Tagline", type: "textarea" },
            { name: "email", label: "Email" },
            { name: "phone", label: "Phone" },
            { name: "addressLine", label: "Address" },
            { name: "linkedinUrl", label: "LinkedIn URL" },
            { name: "xUrl", label: "X URL" },
            { name: "seoTitle", label: "SEO title" },
            { name: "seoDescription", label: "SEO description", type: "textarea" },
            { name: "riskDisclosure", label: "Risk disclosure", type: "textarea" },
          ]}
        />
      ) : null}

      {section === "hero" ? (
        <SingletonForm
          action={saveHeroAction}
          values={draft.hero}
          title="Hero section"
          description="The first thing visitors read, plus the headline statistics."
          fields={[
            { name: "eyebrow", label: "Eyebrow" },
            { name: "headline", label: "Headline" },
            { name: "subheadline", label: "Subheadline", type: "textarea" },
            { name: "primaryCtaLabel", label: "Primary CTA label" },
            { name: "primaryCtaHref", label: "Primary CTA link" },
            { name: "secondaryCtaLabel", label: "Secondary CTA label" },
            { name: "secondaryCtaHref", label: "Secondary CTA link" },
            { name: "statLabelOne", label: "Stat 1 label" },
            { name: "statValueOne", label: "Stat 1 value" },
            { name: "statLabelTwo", label: "Stat 2 label" },
            { name: "statValueTwo", label: "Stat 2 value" },
            { name: "statLabelThree", label: "Stat 3 label" },
            { name: "statValueThree", label: "Stat 3 value" },
          ]}
        />
      ) : null}

      {section === "about" ? (
        <SingletonForm
          action={saveAboutAction}
          values={draft.about}
          title="About section"
          description="Story, mission and the three key figures."
          fields={[
            { name: "heading", label: "Heading" },
            { name: "story", label: "Story", type: "textarea" },
            { name: "mission", label: "Mission", type: "textarea" },
            { name: "figureLabelOne", label: "Figure 1 label" },
            { name: "figureValueOne", label: "Figure 1 value" },
            { name: "figureLabelTwo", label: "Figure 2 label" },
            { name: "figureValueTwo", label: "Figure 2 value" },
            { name: "figureLabelThree", label: "Figure 3 label" },
            { name: "figureValueThree", label: "Figure 3 value" },
          ]}
        />
      ) : null}

      {section === "features" ? <ListEditor kind="features" rows={draft.features} /> : null}
      {section === "steps" ? <ListEditor kind="steps" rows={draft.steps} /> : null}
      {section === "faqs" ? <ListEditor kind="faqs" rows={draft.faqs} /> : null}
      {section === "testimonials" ? <ListEditor kind="testimonials" rows={draft.testimonials} /> : null}
      {section === "team" ? <ListEditor kind="team" rows={draft.team} /> : null}
      {section === "legal" ? <ListEditor kind="legal" rows={draft.legal} /> : null}

      <Card>
        <CardHeader
          title="Version history"
          description="Every publish snapshots the draft. Restore brings a snapshot back into the draft workspace."
          action={<History className="h-4 w-4 text-ink-3" strokeWidth={1.8} />}
        />
        <ul className="divide-y divide-[var(--border)]">
          {versions.map((version) => (
            <li key={version.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span>
                <span className="block text-[13px] font-medium text-ink">{version.label}</span>
                <span className="block text-[11.5px] text-ink-3">{formatDate(version.createdAt, true)}</span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => setRestoring(version.id)}>
                Restore
              </Button>
            </li>
          ))}
          {versions.length === 0 ? (
            <li className="px-5 py-6 text-center text-[13px] text-ink-3">No versions yet — publish to create one.</li>
          ) : null}
        </ul>
      </Card>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publish all draft content?"
        description="The public website is updated immediately and the pages are revalidated. A version snapshot is stored so you can roll back."
        summary={[
          { label: "Pillars", value: String(draft.features.length) },
          { label: "Steps", value: String(draft.steps.length) },
          { label: "FAQs", value: String(draft.faqs.length) },
          { label: "Testimonials", value: String(draft.testimonials.length) },
          { label: "Legal pages", value: String(draft.legal.length) },
        ]}
        confirmLabel="Publish to live site"
        requireWord="PUBLISH"
        pending={publishing}
        onConfirm={async () => {
          setPublishing(true);
          const result = await publishCmsAction();
          setPublishing(false);
          setPublishOpen(false);
          toast({
            title: result.status === "success" ? "Published" : "Publish failed",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(restoring)}
        onOpenChange={(open) => !open && setRestoring(null)}
        tone="danger"
        title="Restore this version into the draft?"
        description="Your current draft content is replaced by the snapshot. The live site is unchanged until you publish again."
        confirmLabel="Restore draft"
        requireWord="RESTORE"
        onConfirm={async () => {
          if (!restoring) return;
          const result = await restoreCmsVersionAction(restoring);
          setRestoring(null);
          toast({
            title: result.status === "success" ? "Draft restored" : "Restore failed",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
          router.refresh();
        }}
      />
    </div>
  );
}


