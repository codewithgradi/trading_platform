import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/legal/"], disallow: ["/admin/", "/trader/", "/client/", "/api/"] }, sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://northline.co.za"}/sitemap.xml` };
}
