import type { Metadata } from "next";
import { AuthLayout, RecoveryForm } from "@/components/auth/auth-pages";
export const metadata: Metadata = { title: "Reset password", robots: { index: false } };
export default function ResetPasswordPage() { return <AuthLayout><RecoveryForm mode="reset" /></AuthLayout>; }
