"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Trash2, UserCheck, UserX } from "lucide-react";

import {
  assignClientAction,
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  setUserStatusAction,
} from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, Card, CardHeader, Field, Input, Select, statusTone } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { formatCurrency, formatDate, roleLabel } from "@/lib/utils";

export type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  balance: number | null;
  traderId: string | null;
  traderName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export function UsersManager({
  users,
  traders,
}: {
  users: ManagedUser[];
  traders: { id: string; fullName: string }[];
}) {
  const [state, action, pending] = useActionState(createUserAction, idleState);
  const [role, setRole] = React.useState("client");
  const [confirm, setConfirm] = React.useState<
    | { kind: "suspend" | "activate" | "delete" | "reset"; user: ManagedUser }
    | null
  >(null);
  const [tempPassword, setTempPassword] = React.useState("Meridian2026!");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Account created", description: state.message, tone: "success" });
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not created", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  const run = async (promise: Promise<{ status: string; message?: string }>) => {
    const result = await promise;
    toast({
      title: result.status === "success" ? "Done" : "Action failed",
      description: result.message,
      tone: result.status === "success" ? "success" : "error",
    });
    setConfirm(null);
    router.refresh();
  };

  const columns: Column<ManagedUser>[] = [
    {
      key: "fullName",
      header: "Name",
      sortValue: (row) => row.fullName,
      render: (row) => (
        <span className="block">
          <span className="block text-[13.5px] font-medium text-ink">{row.fullName}</span>
          <span className="block text-[11.5px] text-ink-3">{row.email}</span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (row) => row.role,
      render: (row) => <Badge tone={row.role === "admin" ? "info" : "neutral"}>{roleLabel[row.role]}</Badge>,
    },
    {
      key: "trader",
      header: "Assigned trader",
      hideOnMobile: true,
      render: (row) =>
        row.role === "client" ? (
          <Select
            value={row.traderId ?? ""}
            onChange={(event) => void run(assignClientAction(row.id, event.target.value))}
            className="h-9 w-44 text-[12.5px]"
            aria-label={`Assign trader for ${row.fullName}`}
          >
            <option value="">Unassigned</option>
            {traders.map((trader) => (
              <option key={trader.id} value={trader.id}>
                {trader.fullName}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-[12.5px] text-ink-3">—</span>
        ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortValue: (row) => row.balance ?? -1,
      render: (row) => (
        <span className="tnum text-[13px] text-ink">
          {row.balance === null ? "—" : formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last login",
      align: "right",
      hideOnMobile: true,
      sortValue: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).getTime() : 0),
      render: (row) => <span className="text-[12.5px] text-ink-3">{formatDate(row.lastLoginAt, true)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Reset password for ${row.fullName}`}
            onClick={() => setConfirm({ kind: "reset", user: row })}
          >
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={row.status === "active" ? `Suspend ${row.fullName}` : `Reactivate ${row.fullName}`}
            onClick={() =>
              setConfirm({ kind: row.status === "active" ? "suspend" : "activate", user: row })
            }
          >
            {row.status === "active" ? (
              <UserX className="h-3.5 w-3.5" strokeWidth={1.8} />
            ) : (
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${row.fullName}`}
            onClick={() => setConfirm({ kind: "delete", user: row })}
          >
            <Trash2 className="h-3.5 w-3.5 text-[var(--negative)]" strokeWidth={1.8} />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
      <Card className="h-fit">
        <CardHeader title="Invite a user" description="Accounts are created by you — there is no public sign-up." />
        <form action={action} className="space-y-4 p-5">
          <Field label="Full name" error={state.errors?.fullName} htmlFor="fullName">
            <Input id="fullName" name="fullName" required placeholder="Jordan Ellis" />
          </Field>
          <Field label="Email" error={state.errors?.email} htmlFor="email">
            <Input id="email" name="email" type="email" required placeholder="jordan@company.com" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" htmlFor="role">
              <Select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="client">Client</option>
                <option value="trader">Trader</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" placeholder="+1 (212) 555-0190" />
            </Field>
          </div>
          {role === "client" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Assign to trader" htmlFor="traderId">
                <Select id="traderId" name="traderId" defaultValue="">
                  <option value="">Unassigned</option>
                  {traders.map((trader) => (
                    <option key={trader.id} value={trader.id}>
                      {trader.fullName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Opening balance" htmlFor="openingBalance">
                <Input
                  id="openingBalance"
                  name="openingBalance"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="tnum"
                />
              </Field>
            </div>
          ) : null}
          <Field
            label="Temporary password"
            hint="The user is prompted to change it after signing in."
            error={state.errors?.temporaryPassword}
            htmlFor="temporaryPassword"
          >
            <Input id="temporaryPassword" name="temporaryPassword" defaultValue="Meridian2026!" required />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Create account
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="All people" description={`${users.length} accounts on the platform`} />
        <DataTable
          rows={users}
          columns={columns}
          pageSize={12}
          searchKeys={(row) => `${row.fullName} ${row.email} ${row.role} ${row.traderName ?? ""}`}
          searchPlaceholder="Search people…"
          emptyTitle="No users"
        />
      </Card>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone={confirm?.kind === "delete" || confirm?.kind === "suspend" ? "danger" : "default"}
        title={
          confirm?.kind === "delete"
            ? "Delete this account permanently?"
            : confirm?.kind === "suspend"
              ? "Suspend this account?"
              : confirm?.kind === "activate"
                ? "Reactivate this account?"
                : "Issue a temporary password?"
        }
        description={
          confirm?.kind === "delete"
            ? "All of this user's data — ledger, requests and conversations — is removed. This cannot be undone."
            : confirm?.kind === "suspend"
              ? "They will be signed out and blocked from signing in until reactivated."
              : confirm?.kind === "activate"
                ? "They will be able to sign in again immediately."
                : "Their current password stops working right away and they are notified in-portal."
        }
        summary={
          confirm
            ? [
                { label: "User", value: confirm.user.fullName },
                { label: "Email", value: confirm.user.email },
                { label: "Role", value: roleLabel[confirm.user.role] },
              ]
            : []
        }
        confirmLabel={
          confirm?.kind === "delete"
            ? "Delete account"
            : confirm?.kind === "suspend"
              ? "Suspend account"
              : confirm?.kind === "activate"
                ? "Reactivate account"
                : "Issue password"
        }
        requireWord={confirm?.kind === "delete" ? "DELETE" : undefined}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "delete") return run(deleteUserAction(confirm.user.id));
          if (confirm.kind === "suspend") return run(setUserStatusAction(confirm.user.id, "suspended"));
          if (confirm.kind === "activate") return run(setUserStatusAction(confirm.user.id, "active"));
          return run(resetUserPasswordAction(confirm.user.id, tempPassword));
        }}
      />

      {confirm?.kind === "reset" ? (
        <div className="fixed bottom-4 left-1/2 z-[96] w-[min(92vw,22rem)] -translate-x-1/2 rounded-xl border border-line bg-elevated p-4">
          <Field label="Temporary password" htmlFor="temp-password">
            <Input
              id="temp-password"
              value={tempPassword}
              onChange={(event) => setTempPassword(event.target.value)}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
