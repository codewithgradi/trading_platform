import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCmsBundle } from "@/lib/cms";
import { formatDate, sanitizeHtml } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const cms = await getCmsBundle("published");
  return cms.legal.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cms = await getCmsBundle("published");
  const page = cms.legal.find((entry) => entry.slug === slug);
  return { title: page?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cms = await getCmsBundle("published");
  const page = cms.legal.find((entry) => entry.slug === slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">Legal</p>
      <h1 className="mt-3 text-[34px] font-bold leading-tight tracking-tight text-ink sm:text-[42px]">
        {page.title}
      </h1>
      <p className="mt-3 text-[13px] text-ink-3">Last updated {formatDate(page.updatedAt)}</p>
      <div
        className="prose-cms mt-10 border-t border-line pt-10"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }}
      />
    </article>
  );
}
