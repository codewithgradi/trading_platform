"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function updateThemePreference(theme: "light" | "dark") {
  const user = await getCurrentUser();
  if (user) await db.update(profiles).set({ theme, updatedAt: new Date() }).where(eq(profiles.id, user.id));
}
