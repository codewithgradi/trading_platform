"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, ShieldCheck } from "lucide-react";

import { changePasswordAction, updateProfileAction } from "@/app/actions/portal";
import { persistThemeAction, restartOnboardingAction, signOutEverywhereAction } from "@/app/actions/session";
import { Avatar } from "@/components/features/portal-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { formatDate, roleLabel } from "@/lib/utils";

export type ProfileView = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  theme: string;
  emailNotifications: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export function ProfileForm({ profile, summary }: { profile: ProfileView; summary?: React.ReactNode }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, idleState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, idleState);
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (profileState.status === "success") {
      toast({ title: "Profile saved", description: profileState.message, tone: "success" });
      router.refresh();
    }
    if (profileState.status === "error" && profileState.message) {
      toast({ title: "Not saved", description: profileState.message, tone: "error" });
    }
  }, [profileState, toast, router]);

  useEffect(() => {
    if (passwordState.status === "success") {
      toast({ title: "Password changed", description: passwordState.message, tone: "success" });
    }
    if (passwordState.status === "error" && passwordState.message) {
      toast({ title: "Password not changed", description: passwordState.message, tone: "error" });
    }
  }, [passwordState, toast]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Your details" description="This is how the desk and your portal address you." />
          <form action={profileAction} className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <Avatar name={profile.fullName} src={profile.avatarUrl} size={56} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-tight text-ink">{profile.fullName}</p>
                <p className="text-[12.5px] text-ink-3">
                  {roleLabel[profile.role]} · member since {formatDate(profile.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={profileState.errors?.fullName} htmlFor="fullName">
                <Input id="fullName" name="fullName" defaultValue={profile.fullName} required />
              </Field>
              <Field label="Email" hint="Contact the desk to change your sign-in email." htmlFor="email-ro">
                <Input id="email-ro" value={profile.email} readOnly disabled />
              </Field>
              <Field label="Phone" error={profileState.errors?.phone} htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+1 (212) 555-0100" />
              </Field>
              <Field label="Avatar URL" error={profileState.errors?.avatarUrl} htmlFor="avatarUrl">
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  defaultValue={profile.avatarUrl ?? ""}
                  placeholder="https://…"
                />
              </Field>
            </div>

            <Field label="Short bio / notes" error={profileState.errors?.bio} htmlFor="bio">
              <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} className="min-h-[90px]" />
            </Field>

            <label className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
              <input
                type="checkbox"
                name="emailNotifications"
                defaultChecked={profile.emailNotifications}
                className="h-4 w-4 accent-[var(--text)]"
              />
              <span className="text-[13px] text-ink-2">
                Email me when my balance changes or the desk replies
              </span>
            </label>

            <Button type="submit" loading={profilePending}>
              Save changes
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Password" description="Use at least 8 characters with a number and a capital." />
          <form action={passwordAction} className="space-y-4 p-5">
            <Field label="Current password" error={passwordState.errors?.currentPassword} htmlFor="currentPassword">
              <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" error={passwordState.errors?.newPassword} htmlFor="newPassword">
                <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
              </Field>
              <Field label="Confirm new password" error={passwordState.errors?.confirmPassword} htmlFor="confirmPassword">
                <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
              </Field>
            </div>
            <Button type="submit" variant="secondary" loading={passwordPending}>
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
              Change password
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        {summary}

        <Card>
          <CardHeader title="Preferences" />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[13px] font-medium text-ink-2">Theme</p>
              <div className="mt-2 flex gap-2">
                {(["light", "dark", "system"] as const).map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={theme === option ? "primary" : "secondary"}
                    onClick={() => {
                      setTheme(option);
                      void persistThemeAction(option);
                    }}
                  >
                    {option}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-3">Saved to your profile and applied on every device.</p>
            </div>

            <div className="border-t border-line pt-4">
              <p className="text-[13px] font-medium text-ink-2">Product tour</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.dispatchEvent(new Event("replay-tour"))}
                >
                  Replay guide now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await restartOnboardingAction();
                    toast({ title: "The guide will run again at your next sign-in", tone: "info" });
                  }}
                >
                  Show on next login
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sessions" description={`Last sign-in ${formatDate(profile.lastLoginAt, true)}`} />
          <div className="p-5">
            <Button variant="danger" size="sm" onClick={() => setSignOutOpen(true)}>
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              Sign out of all devices
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        tone="danger"
        title="Sign out of every device?"
        description="All active sessions will be ended, including this one. You'll need to sign in again."
        confirmLabel="Sign out everywhere"
        requireWord="SIGN OUT"
        onConfirm={async () => {
          await signOutEverywhereAction();
          window.location.href = "/login";
        }}
      />
    </div>
  );
}
