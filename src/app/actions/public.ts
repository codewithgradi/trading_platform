"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { contactSubmissions, notifications, profiles } from "@/db/schema";
import { fail, ok, rateLimit, zodErrors, type ActionState } from "@/lib/action-state";
import { contactSchema } from "@/lib/validators";

export async function submitContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    company: String(formData.get("company") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  });

  if (!parsed.success) return fail("Please check the highlighted fields.", zodErrors(parsed.error));

  const ip = (await headers()).get("x-forwarded-for") ?? "local";
  if (!rateLimit(`contact:${ip}`, 4, 10 * 60_000)) {
    return fail("You've sent several messages already. Please try again shortly.");
  }

  const [submission] = await db
    .insert(contactSubmissions)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      message: parsed.data.message,
    })
    .returning();

  const admins = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, "admin"));
  if (admins.length) {
    await db.insert(notifications).values(
      admins.map((admin) => ({
        userId: admin.id,
        type: "system" as const,
        title: "New enquiry from the website",
        body: `${parsed.data.name} (${parsed.data.email}) sent a message through the contact form.`,
        data: { submissionId: submission.id },
      })),
    );
  }

  return ok("Thanks — your message is with our team. We reply within one business day.");
}
