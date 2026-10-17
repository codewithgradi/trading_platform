import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/auth-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const purpose = form.get("purpose") === "cms" ? "cms" : "avatar";
  if (purpose === "cms" && user.role !== "admin") return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || file.size < 1) return NextResponse.json({ error: "Choose a JPG, PNG or WebP image under 4 MB." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (supabaseConfigured()) {
    const client = (await createSupabaseServerClient())!;
    const bucket = purpose === "cms" ? "cms-images" : "avatars";
    const objectPath = `${user.id}/${filename}`;
    const { error } = await client.storage.from(bucket).upload(objectPath, buffer, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
    return NextResponse.json({ url: data.publicUrl });
  }
  // Local demo only. Production deployments should configure Supabase Storage.
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);
  return NextResponse.json({ url: `/uploads/${filename}` });
}
