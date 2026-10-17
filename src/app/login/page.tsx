import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthLayout, LoginForm } from "@/components/auth/auth-pages";
export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(`/${user.role}`);
  const { next } = await searchParams;
  return <AuthLayout><LoginForm next={next} /></AuthLayout>;
}
