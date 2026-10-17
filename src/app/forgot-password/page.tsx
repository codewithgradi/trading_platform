import type { Metadata } from "next";
import { AuthLayout, RecoveryForm } from "@/components/auth/auth-pages";
export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export default function ForgotPasswordPage() { return <AuthLayout><RecoveryForm mode="forgot" /></AuthLayout>; }
