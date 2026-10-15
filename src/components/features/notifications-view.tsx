"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { PageHeader } from "@/components/features/portal-shell";
import { Badge, Button, Card, EmptyState, Select } from "@/components/ui/primitives";
import { formatDate, timeAgo } from "@/lib/utils";

export type NotificationRowView = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const TONES: Record<string, "positive" | "info" | "warning" | "neutral"> = {
  balance: "positive",
  withdrawal: "warning",
  feedback: "info",
  system: "neutral",
};

export function NotificationsView({ rows }: { rows: NotificationRowView[] }) {
  const [filter, setFilter] = React.useState("all");
  const router = useRouter();
  const queryClient = useQueryClient();

  const visible = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "unread") return !row.readAt;
    return row.type === filter;
  });

  const unread = rows.filter((row) => !row.readAt).length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Every balance change, withdrawal update and message from the desk."
        action={
          unread > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await markAllNotificationsRead();
                refresh();
              }}
            >
              <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
              Mark all read ({unread})
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink-2">
            <span className="font-semibold text-ink">{visible.length}</span> notifications
            {unread > 0 ? ` · ${unread} unread` : ""}
          </p>
          <Select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-10 sm:w-52"
            aria-label="Filter notifications"
          >
            <option value="all">All notifications</option>
            <option value="unread">Unread only</option>
            <option value="balance">Balance changes</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="feedback">Feedback</option>
            <option value="system">System</option>
          </Select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-4 w-4" strokeWidth={1.8} />}
            title="Nothing to read"
            description="New alerts will appear here the moment something changes on your account."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            <AnimatePresence initial={false}>
              {visible.map((row, index) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.2) }}
                  className="flex gap-4 px-5 py-4"
                >
                  <span
                    aria-hidden
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                      row.readAt ? "bg-transparent" : "bg-[var(--positive)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold tracking-tight text-ink">{row.title}</p>
                      <Badge tone={TONES[row.type] ?? "neutral"}>{row.type}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{row.body}</p>
                    <p className="mt-1.5 text-[11.5px] text-ink-3">
                      {timeAgo(row.createdAt)} · {formatDate(row.createdAt, true)}
                    </p>
                  </div>
                  {!row.readAt ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await markNotificationRead(row.id);
                        refresh();
                      }}
                      className="self-start rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      Mark read
                    </button>
                  ) : null}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </>
  );
}
