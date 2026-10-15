"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { toggleTwoFactorAction, updateAdminEmailAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";

export function AdminSecurity({
  currentEmail,
  twoFactorEnabled,
}: {
  currentEmail: string;
  twoFactorEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateAdminEmailAction, idleState);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [email, setEmail] = React.useState(currentEmail);
  const formRef = React.useRef<HTMLFormElement>(null);
  const bypassRef = React.useRef(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Email updated", description: state.message, tone: "success" });
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not updated", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Sign-in email"
          description="Changing this requires your current password and is written to the audit log."
        />
        <form
          ref={formRef}
          action={action}
          className="space-y-4 p-5"
          onSubmit={(event) => {
            if (bypassRef.current) {
              bypassRef.current = false;
              return;
            }
            event.preventDefault();
            setConfirmOpen(true);
          }}
        >
          <Field label="New email" error={state.errors?.email} htmlFor="admin-email">
            <Input
              id="admin-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Current password" error={state.errors?.password} htmlFor="admin-password">
            <Input id="admin-password" name="password" type="password" required autoComplete="current-password" />
          </Field>
          <Button type="submit" loading={pending}>
            Update email
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Two-factor prompt"
          description="Require a second factor the next time this account signs in."
        />
        <div className="flex items-center justify-between gap-4 p-5">
          <p className="text-[13px] text-ink-2">
            Status:{" "}
            <span className="font-semibold text-ink">{twoFactorEnabled ? "Enabled" : "Disabled"}</span>
          </p>
          <Button
            variant={twoFactorEnabled ? "secondary" : "primary"}
            size="sm"
            onClick={async () => {
              const result = await toggleTwoFactorAction(!twoFactorEnabled);
              toast({
                title: result.status === "success" ? "Updated" : "Failed",
                description: result.message,
                tone: result.status === "success" ? "success" : "error",
              });
              router.refresh();
            }}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            {twoFactorEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Change your sign-in email?"
        description="You will use the new address the next time you sign in. The change is recorded in the audit log."
        summary={[
          { label: "Email", before: currentEmail, after: email },
        ]}
        confirmLabel="Update email"
        requireWord="CONFIRM"
        pending={pending}
        onConfirm={() => {
          bypassRef.current = true;
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
