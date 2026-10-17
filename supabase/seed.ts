import dotenv from "dotenv";
import path from "node:path";

// 1. Explicitly load .env.local first (where your credentials actually live)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
// Fallback to .env just in case
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// 2. NOW import things that rely on process.env
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { hash } from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cmsDocuments, profiles } from "../src/db/schema";


// This script is intentionally unavailable in production. Demo credentials are NOT production credentials.
if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
)
  throw new Error("Demo seeding is disabled in production.");

const demoPassword = "Northline2026!";
const staff = [
  { name: "Amina Patel", email: "admin@northline.co.za", role: "admin" },
  { name: "Thabo Maseko", email: "thabo@northline.co.za", role: "trader" },
  { name: "Zanele Khumalo", email: "zanele@northline.co.za", role: "trader" },
  {
    name: "Karabo van der Merwe",
    email: "karabo@northline.co.za",
    role: "trader",
  },
] as const;
const clientNames = [
  ["Nomsa Mokoena", "nomsa@northline.co.za"],
  ["Daniel Jacobs", "daniel.jacobs@demo.northline.co.za"],
  ["Thandi Ndlovu", "thandi.ndlovu@demo.northline.co.za"],
  ["Sipho Dlamini", "sipho.dlamini@demo.northline.co.za"],
  ["Naledi Molefe", "naledi.molefe@demo.northline.co.za"],
  ["Pieter du Plessis", "pieter.duplessis@demo.northline.co.za"],
  ["Lerato Nkosi", "lerato.nkosi@demo.northline.co.za"],
  ["Johan Botha", "johan.botha@demo.northline.co.za"],
  ["Ayanda Zulu", "ayanda.zulu@demo.northline.co.za"],
  ["Megan Williams", "megan.williams@demo.northline.co.za"],
  ["Sibusiso Mthembu", "sibusiso.mthembu@demo.northline.co.za"],
  ["Fatima Daniels", "fatima.daniels@demo.northline.co.za"],
  ["Bongani Sithole", "bongani.sithole@demo.northline.co.za"],
  ["Jessica Naidoo", "jessica.naidoo@demo.northline.co.za"],
  ["Tshepo Radebe", "tshepo.radebe@demo.northline.co.za"],
  ["Chloe Petersen", "chloe.petersen@demo.northline.co.za"],
  ["Mandla Hadebe", "mandla.hadebe@demo.northline.co.za"],
  ["Anika de Klerk", "anika.deklerk@demo.northline.co.za"],
  ["Refilwe Seabi", "refilwe.seabi@demo.northline.co.za"],
  ["Ethan September", "ethan.september@demo.northline.co.za"],
] as const;
const people = [
  ...staff,
  ...clientNames.map(([name, email]) => ({
    name,
    email,
    role: "client" as const,
  })),
];
function stableId(email: string) {
  const h = createHash("sha256")
    .update(`northline-demo:${email}`)
    .digest("hex")
    .slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && !serviceKey)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to create demo Auth users.",
    );
  const authAdmin =
    supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
  const existingUsers = authAdmin
    ? (await authAdmin.auth.admin.listUsers({ perPage: 1000 })).data.users
    : [];
  const hashedPassword = authAdmin ? null : await hash(demoPassword, 12);
  let adminId = "";
  for (const person of people) {
    let id = stableId(person.email);
    if (authAdmin) {
      const existing = existingUsers.find(
        (user) => user.email?.toLowerCase() === person.email.toLowerCase(),
      );
      if (existing) id = existing.id;
      else {
        const { data, error } = await authAdmin.auth.admin.createUser({
          email: person.email,
          password: demoPassword,
          email_confirm: true,
          user_metadata: { full_name: person.name },
        });
        if (error || !data.user)
          throw new Error(
            `Could not create ${person.email}: ${error?.message}`,
          );
        id = data.user.id;
      }
    }
    if (person.role === "admin") adminId = id;
    await db
      .insert(profiles)
      .values({
        id,
        role: person.role,
        fullName: person.name,
        email: person.email,
        passwordHash: hashedPassword,
        phone: person.role === "client" ? "+27 82 400 0000" : "+27 21 012 4800",
      })
      .onConflictDoNothing();
  }
  const seedSql = await readFile(
    path.join(process.cwd(), "supabase", "seed.sql"),
    "utf8",
  );
  await db.execute(sql.raw(seedSql));

  // In Supabase mode copy the local editorial assets to Storage and publish their URLs.
  if (authAdmin && adminId) {
    for (const [key, filename] of [
      ["hero", "hero-city.jpg"],
      ["about", "studio.jpg"],
    ] as const) {
      const bytes = await readFile(
        path.join(process.cwd(), "public", "images", filename),
      );
      const objectPath = `${adminId}/${filename}`;
      const { error } = await authAdmin.storage
        .from("cms-images")
        .upload(objectPath, bytes, { contentType: "image/jpeg", upsert: true });
      if (error)
        throw new Error(`Could not upload ${filename}: ${error.message}`);
      const { data: asset } = authAdmin.storage
        .from("cms-images")
        .getPublicUrl(objectPath);
      const [document] = await db
        .select()
        .from(cmsDocuments)
        .where(eq(cmsDocuments.key, key))
        .limit(1);
      if (document)
        await db
          .update(cmsDocuments)
          .set({
            published: { ...document.published, imageUrl: asset.publicUrl },
            draft: { ...document.draft, imageUrl: asset.publicUrl },
          })
          .where(eq(cmsDocuments.key, key));
    }
  }
  console.log(
    `Seed complete: ${people.length} demo accounts, ninety days of ZAR ledger history, trades, conversations and CMS content.`,
  );
  console.log(
    "Demo login emails: admin@northline.co.za, thabo@northline.co.za, nomsa@northline.co.za",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
