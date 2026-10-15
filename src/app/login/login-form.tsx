"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { signInAction } from "@/app/actions/session";
import { Button, Field, Input } from "@/components/ui/primitives";
import { idleState } from "@/lib/action-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, idleState);
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-[var(--negative)]/30 bg-[var(--negative)]/8 px-4 py-3 text-[13px] text-[var(--negative)]"
        >
          {state.message}
        </div>
      ) : null}

      <Field label="Email" error={state.errors?.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </Field>

      <Field label="Password" error={state.errors?.password} htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors hover:text-ink"
          >
            {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.8} /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-between">
        <Link href="/forgot-password" className="text-[13px] text-ink-2 underline-offset-2 hover:text-ink hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
