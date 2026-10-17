import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://northline.co.za";
  return ["", "/legal/terms", "/legal/privacy", "/legal/risk"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path ? "yearly" as const : "weekly" as const, priority: path ? .3 : 1 }));
}
