import type { MetadataRoute } from "next";

import { getCmsBundle } from "@/lib/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://meridian-capital.example.com";
  const cms = await getCmsBundle("published");

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...cms.legal.map((page) => ({
      url: `${base}/legal/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
